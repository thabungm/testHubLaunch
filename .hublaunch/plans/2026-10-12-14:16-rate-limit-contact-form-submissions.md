# Add in-memory rate limiting to contact form submissions

## Plan Summary

- **What / why:** Throttle how often `submitContactForm()` (`scripts/contact.ts`) will POST to the Slack webhook, rejecting submissions that exceed a fixed rate so the webhook cannot be flooded within a single process.
- **Key decisions:** Global (single shared) budget of **5 submissions per 60,000 ms**, enforced with a **sliding window** of in-memory timestamps; over-limit submissions **throw a new `ContactRateLimitError`** *after* validation and *before* `fetch` (no Slack call). Limits are hardcoded constants, not configurable.
- **Most important file:** `scripts/contact.ts` — the only submission path and the home of all new code. Tests go in `scripts/test-contact.ts`; docs in `README.md`.
- **Scope / dependencies:** Zero new npm dependencies (Node built-ins only); no HTTP layer, no persistence. State is process-local and resets on every CLI run.
- **Priority / complexity:** Medium priority, **low complexity** — additive change to one ~120-line file plus two new tests and a doc update.

## Problem Statement

The contact feature is headless: `submitContactForm(input)` in `scripts/contact.ts:65` is the single submission path. It resolves `SLACK_URL`, validates the input, then `fetch`-POSTs a Slack Block Kit message and returns `{ status, body }`. There is **no** throttle: a caller invoking `submitContactForm()` in a loop would POST to the Slack webhook as fast as the event loop allows. We want to cap the send rate and reject excess submissions before they reach Slack.

There is no HTTP server, router, middleware, IP, session, or user identity anywhere in the repo, and `ContactInput` (`scripts/contact.ts:1-6`) carries no client identifier — only `name`, `email`, `subject`, `body`. The project has **zero runtime dependencies** (`package.json`) and no store (no Redis/DB/cache). So the limiter must be hand-rolled, dependency-free, and keyed on something the function already has.

#### Planning Context

**Key requirements (confirmed):**
- Add in-memory, process-local rate limiting to `submitContactForm()`. No file or DB persistence; a fresh CLI run starts with an empty limiter.
- **Global key** — one shared budget for all submissions in the process, regardless of `email` or any other field. No new caller-supplied identifier parameter; `submitContactForm()`'s signature is unchanged.
- **Policy:** maximum **5** submissions per **60,000 ms**, as a **sliding window**. Hardcoded constants `CONTACT_RATE_LIMIT_MAX = 5` and `CONTACT_RATE_LIMIT_WINDOW_MS = 60_000`. Not configurable via env var or options.
- **Rejection surface:** throw a new typed error `ContactRateLimitError extends Error`, mirroring `ContactValidationError` (`scripts/contact.ts:8-15`). It carries `retryAfterMs`, `limit`, `windowMs`. Thrown after `validateContact()` passes and before `fetch`, so no Slack call is made.

**Decisions made (with rationale):**
- *Global vs per-email/per-caller:* Global was chosen for simplicity — there is no reliable client identifier and the goal is protecting the one shared webhook, not fairness between callers.
- *Hardcoded vs configurable:* Hardcoded constants were chosen over env vars/options to keep the surface minimal; the constants are exported so callers/tests can read them.
- *Throw vs synthetic 429 vs silent drop:* Throwing a typed error mirrors the module's existing `ContactValidationError` convention and lets callers distinguish "rate limited" from a real Slack `429`. A silent drop would hide the condition.
- *Sliding window vs fixed window / cooldown:* A sliding window (prune timestamps older than `now - windowMs`) gives accurate "5 per any 60 s" behavior without the boundary bursts of a fixed window, and is trivial to implement with a `number[]`.
- *Record-on-pass, before `fetch`:* A slot is consumed when the limiter check passes, before the network call and regardless of the Slack response. This protects the webhook even when Slack itself errors.

**Out of scope:**
- Persistent / cross-invocation / cross-process state (temp file, Redis, DB) — backlogged. In-memory only.
- Per-email keying, env-var/option configuration, any HTTP layer or middleware.
- Any change to existing behavior (validation, payload shape, `{ status, body }` return, `SLACK_URL` parsing).
- The uncommitted `errorWatcher.ts` changes in the working tree are unrelated. This plan is cut from `main` (commit `5297643`); all line references use the committed version, which matches the current checkout.

## Detailed Requirements

### Functional
1. `submitContactForm()` enforces a global limit of 5 accepted submissions per rolling 60,000 ms window within the process.
2. The 6th submission inside the window throws `ContactRateLimitError` and does **not** POST to Slack.
3. Once enough time passes that fewer than 5 accepted timestamps remain inside the window, submissions succeed again.
4. Invalid submissions (rejected by `validateContact`) do **not** consume a rate-limit slot — the limiter check runs only after validation passes.
5. The CLI `main()` prints a clear rate-limit message and exits `1` when the limit is hit.

### Technical
1. Implementation lives entirely in `scripts/contact.ts`, dependency-free, using only Node built-ins (`Date.now()`).
2. Limiter state is a module-level `number[]` of accepted-submission timestamps (epoch ms).
3. New exports: `ContactRateLimitError`, `enforceContactRateLimit(now?)`, `resetContactRateLimit()`, `CONTACT_RATE_LIMIT_MAX`, `CONTACT_RATE_LIMIT_WINDOW_MS`.
4. `submitContactForm()` signature and return type are unchanged.
5. Must pass `npm run typecheck` (`tsc --noEmit`, `strict: true`).

### Non-Functional
1. No new npm dependencies; `package.json` dependency set unchanged.
2. Pruning is O(n) over at most ~5 kept timestamps + the current batch — negligible cost.
3. `SLACK_URL` continues to never be logged; the error message contains no secret.

## Proposed Solution

Add a small, self-contained sliding-window limiter to `scripts/contact.ts` and call it from `submitContactForm()` between validation and `fetch`. Keep the check pure and testable by exposing `enforceContactRateLimit(now)` (injectable clock) and `resetContactRateLimit()`.

Request flow inside `submitContactForm()` (order matters):

```
submitContactForm(input)
  ├─ resolve & clean SLACK_URL ─── throw Error if unset      (unchanged)
  ├─ validateContact(input) ────── throw ContactValidationError (unchanged; no slot consumed)
  ├─ enforceContactRateLimit() ─── throw ContactRateLimitError  (NEW; records slot on pass)
  └─ fetch(url, …) ─────────────── POST to Slack → { status, body } (unchanged)
```

`enforceContactRateLimit(now)`:
1. Prune the module-level `timestamps` array to entries `> now - CONTACT_RATE_LIMIT_WINDOW_MS`.
2. If `timestamps.length >= CONTACT_RATE_LIMIT_MAX`, compute `retryAfterMs = timestamps[0] + CONTACT_RATE_LIMIT_WINDOW_MS - now` and throw `ContactRateLimitError`.
3. Otherwise push `now` and return.

## Technical Considerations
- **Dependencies / config:** None added. Constants hardcoded and exported; no env vars.
- **State lifetime:** Module-level state is per-process and resets on restart. For the one-shot CLI (`npm run contact`, `npm run test:contact`) each run starts empty, so the limiter only meaningfully triggers within a single process (as in the new live test, which does 5 sends in one run). This is intentional and documented.
- **Security:** The limiter protects the shared Slack webhook from in-process flooding. `retryAfterMs` is derived from timestamps only and leaks no secret. `SLACK_URL` handling is untouched.
- **Clock:** Uses `Date.now()`; `enforceContactRateLimit` accepts an optional `now` for deterministic tests.

## Testing Strategy

Extend `scripts/test-contact.ts` (live e2e convention, no fetch stubbing). Add the new imports: `ContactRateLimitError`, `enforceContactRateLimit`, `resetContactRateLimit`.

- **Test 1 (existing, unchanged):** one real Slack send asserts HTTP 200 (`scripts/test-contact.ts:14-31`).
- **Test 2 (existing, unchanged):** `validateContact` rejects bad input with no network (`scripts/test-contact.ts:33-45`).
- **Test 3 (new, live):** send 4 more real submissions (total 5 in the window counting Test 1), assert each HTTP 200. Then a 6th `submitContactForm()` must throw `ContactRateLimitError` with `0 < retryAfterMs <= 60_000`. → 5 real Slack messages per run.
- **Test 4 (new, no network):** `resetContactRateLimit()`, then call `enforceContactRateLimit(t)` 5 times with a fixed `t` (succeed), assert the 6th throws `ContactRateLimitError`, then assert `enforceContactRateLimit(t + CONTACT_RATE_LIMIT_WINDOW_MS)` succeeds (window expiry) — no waiting, no network.
- **Type-check:** `npm run typecheck` stays clean (strict).

> Note: Test 3 depends on Test 1 having already consumed one slot and on no reset between them. Keep Test 3 after Test 1 and do **not** call `resetContactRateLimit()` before it. Test 4 must call `resetContactRateLimit()` first to isolate from the live tests.

## Documentation Updates

`README.md`:
- **API section (`scripts/contact.ts`, lines 68-79):** add a bullet for `ContactRateLimitError` (carries `retryAfterMs`, `limit`, `windowMs`), and note that `submitContactForm` enforces max 5 submissions per 60 s (sliding window), throwing `ContactRateLimitError` before any Slack call when exceeded. Mention the limit is **in-memory and per-process** (resets each run).
- **Live-test description (lines 46-60):** update to reflect 5 real messages per run and the two new tests (Test 3 live over-limit, Test 4 no-network window expiry).

## Acceptance Criteria
1. `submitContactForm()` throws `ContactRateLimitError` on the 6th call within 60 s and performs no Slack POST on that call.
2. The first 5 calls within the window succeed and return `{ status, body }` unchanged.
3. `ContactRateLimitError` exposes `retryAfterMs`, `limit` (= 5), `windowMs` (= 60000), `name === "ContactRateLimitError"`, and a message of the form `Rate limit exceeded: max 5 submissions per 60s; retry in <N>s`.
4. Invalid input still throws `ContactValidationError` and consumes no slot.
5. `CONTACT_RATE_LIMIT_MAX`, `CONTACT_RATE_LIMIT_WINDOW_MS`, `enforceContactRateLimit`, `resetContactRateLimit`, and `ContactRateLimitError` are all exported.
6. CLI `main()` prints `Rate limit exceeded: retry in <N>s` and exits `1` when the limit is hit.
7. `npm run typecheck` passes with no errors.
8. `npm run test:contact` prints `ALL PASS` (Tests 1–4) when `SLACK_URL` is set.
9. Existing validation, payload shape, return shape, and `SLACK_URL` parsing are unchanged.

<details><summary><b>Implementation Detail</b></summary>

## Implementation Steps

### Phase 1 — Add the limiter primitives to `scripts/contact.ts`

**1a. Add `ContactRateLimitError`** mirroring `ContactValidationError` (`scripts/contact.ts:8-15`). Place it just below that class (after line 15):

```ts
export class ContactRateLimitError extends Error {
  retryAfterMs: number;
  limit: number;
  windowMs: number;
  constructor(retryAfterMs: number, limit: number, windowMs: number) {
    const retrySec = Math.ceil(retryAfterMs / 1000);
    super(
      `Rate limit exceeded: max ${limit} submissions per ${Math.round(
        windowMs / 1000,
      )}s; retry in ${retrySec}s`,
    );
    this.name = "ContactRateLimitError";
    this.retryAfterMs = retryAfterMs;
    this.limit = limit;
    this.windowMs = windowMs;
  }
}
```

**1b. Add constants and module-level state** near the other module constant `EMAIL_RE` (`scripts/contact.ts:17`):

```ts
export const CONTACT_RATE_LIMIT_MAX = 5;
export const CONTACT_RATE_LIMIT_WINDOW_MS = 60_000;

// Epoch-ms timestamps of accepted submissions, within the current window.
// Module-level: process-local, resets on restart. Not persisted by design.
const rateLimitTimestamps: number[] = [];
```

**1c. Add `enforceContactRateLimit` and `resetContactRateLimit`** (place after `validateContact`, around `scripts/contact.ts:33`, so it reads as a sibling gate to validation):

```ts
// Pure, injectable-clock sliding-window check. Records a slot on success.
// Throws ContactRateLimitError when the window is full.
export function enforceContactRateLimit(now: number = Date.now()): void {
  const cutoff = now - CONTACT_RATE_LIMIT_WINDOW_MS;
  // Prune expired timestamps (keep only those still inside the window).
  let kept = 0;
  for (const t of rateLimitTimestamps) {
    if (t > cutoff) rateLimitTimestamps[kept++] = t;
  }
  rateLimitTimestamps.length = kept;

  if (rateLimitTimestamps.length >= CONTACT_RATE_LIMIT_MAX) {
    const oldest = rateLimitTimestamps[0];
    const retryAfterMs = oldest + CONTACT_RATE_LIMIT_WINDOW_MS - now;
    throw new ContactRateLimitError(
      retryAfterMs,
      CONTACT_RATE_LIMIT_MAX,
      CONTACT_RATE_LIMIT_WINDOW_MS,
    );
  }
  rateLimitTimestamps.push(now);
}

// Test helper: clear all recorded submission timestamps.
export function resetContactRateLimit(): void {
  rateLimitTimestamps.length = 0;
}
```

Note: the prune keeps array order ascending (timestamps are pushed in increasing `now`), so `rateLimitTimestamps[0]` is the oldest kept entry and `retryAfterMs` is always `> 0` when the array is full.

### Phase 2 — Wire the check into `submitContactForm()`

In `scripts/contact.ts:79`, immediately after `validateContact(input);` and before the `fetch` at line 81, insert:

```ts
  enforceContactRateLimit(); // throws ContactRateLimitError when over the limit; records a slot
```

Order is: `SLACK_URL` resolve (lines 68-77) → `validateContact` (line 79) → `enforceContactRateLimit()` (new) → `fetch` (line 81). This guarantees invalid input consumes no slot and over-limit sends never reach Slack.

### Phase 3 — CLI `main()` catch branch

In `main()`'s catch block (`scripts/contact.ts:104-112`), add a branch before the generic `else`, alongside the existing `ContactValidationError` branch (lines 105-107):

```ts
  } else if (err instanceof ContactRateLimitError) {
    console.error(`Rate limit exceeded: retry in ${Math.ceil(err.retryAfterMs / 1000)}s`);
  } else {
```

(The `process.exit(1)` at the end of the catch, line 111, already applies.)

### Phase 4 — Tests (`scripts/test-contact.ts`)

- Extend the import block (`scripts/test-contact.ts:1-6`) to add `ContactRateLimitError`, `enforceContactRateLimit`, `resetContactRateLimit`.
- **Test 3** (after Test 2, before `ALL PASS` at line 47): loop 4 real `submitContactForm(valid)` sends asserting HTTP 200 each; then a 6th call wrapped in try/catch that must throw `ContactRateLimitError` with `0 < retryAfterMs <= 60_000` (fail if no throw or wrong type).
- **Test 4** (no network): call `resetContactRateLimit()`; pick a fixed `const t = 1_000_000;` call `enforceContactRateLimit(t)` 5× (must not throw); assert the 6th `enforceContactRateLimit(t)` throws `ContactRateLimitError`; assert `enforceContactRateLimit(t + CONTACT_RATE_LIMIT_WINDOW_MS)` does not throw.

Keep the existing `process.exit`-on-failure style. Reuse the `valid` payload from Test 1 for Test 3 sends (optionally vary the subject timestamp per send for easier channel inspection).

### Phase 5 — Docs

Update `README.md` API section (lines 68-79) and live-test section (lines 46-60) as described under **Documentation Updates**.

## Edge Cases
- **Validation failure before limiter:** bad input throws `ContactValidationError` and never calls `enforceContactRateLimit`, so no slot is consumed. (Covered by order in Phase 2.)
- **Slack error after slot recorded:** the slot is consumed even if `fetch` returns non-200 or throws — intentional, to protect the webhook from retried floods.
- **Exactly at the boundary:** an entry with `t === cutoff` is pruned (`t > cutoff` is false), so a submission exactly `windowMs` after an old one is allowed.
- **`retryAfterMs` sign:** only computed when the window is full (≥ 5 kept entries), so `oldest + windowMs - now` is always positive.
- **Fresh process:** `rateLimitTimestamps` starts empty; one-shot CLI runs effectively never hit the limit across separate invocations (documented limitation).

## Data Shapes
- `ContactRateLimitError`: `{ name: "ContactRateLimitError", message: string, retryAfterMs: number, limit: number, windowMs: number }`.
- Module state: `rateLimitTimestamps: number[]` (epoch ms, ascending).
- `submitContactForm` return: `{ status: number; body: string }` — **unchanged**.

## Rollback / Risk
- Pure additive change to one file plus tests and docs. Revert = remove the new exports, the one call in `submitContactForm`, and the new tests. No schema/data migration, no dependency change.
- Main behavioral risk: a long-lived caller could now be throttled where it previously was not — this is the intended behavior and is documented.

## Dependencies & Related Work
- No new dependencies. Node built-in `Date.now()` and global `fetch` only.
- Related/backlogged: persistent cross-invocation limiting (temp file or external store), per-email or per-caller keying, env-var configuration. All explicitly out of scope here.

</details>
