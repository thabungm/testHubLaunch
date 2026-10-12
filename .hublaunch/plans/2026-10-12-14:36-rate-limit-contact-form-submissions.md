# Add rate limiting to contact form submissions

## Plan Summary

- **What / why:** Add an in-memory, process-local rate limit to `submitContactForm()` in `scripts/contact.ts` so a single long-running process cannot flood the Slack webhook. Purely additive — no existing behavior changes.
- **Key decisions:** Global key (one shared budget for all submissions, no per-email/per-caller keying), hardcoded sliding window of **5 submissions per 60,000 ms**, rejection surfaced by throwing a new typed `ContactRateLimitError` (mirroring `ContactValidationError`). State is module-level and resets on process restart; **no** persistence and **no** new npm dependencies.
- **Most important file:** `scripts/contact.ts` (the entire feature + the new limiter). Secondary: `scripts/test-contact.ts` (tests) and `README.md` (docs).
- **Priority / complexity:** Low complexity, self-contained, Node built-ins only. No HTTP layer, framework, or external store introduced.
- **Known limitation (accepted):** The primary usage is one-shot CLI runs (`npm run contact`, `npm run test:contact`), each a fresh process, so cross-invocation limiting never triggers. This is intended — the limiter targets a future long-lived caller. Cross-invocation persistence is explicitly out of scope / backlogged.

## Problem Statement

`submitContactForm()` (`scripts/contact.ts:65-87`) is the single submission path for the headless "Contact Us" feature. It resolves `SLACK_URL`, validates the input, then unconditionally `fetch`-POSTs to the Slack Incoming Webhook. There is no throttling of any kind — a caller that invokes `submitContactForm()` in a tight loop (within one process) will post to Slack on every call, with no guard protecting the webhook from abuse or runaway loops.

This plan adds a dependency-free, in-process rate limiter that gates the actual Slack send: once a threshold is exceeded within a rolling time window, further submissions are rejected (with a typed error) **before** any network call is made.

#### Planning Context

**Key requirements (confirmed):**

- **Bucket key:** *Global* — one shared limit across all submissions in the process, regardless of `email` or any other field. No new caller-supplied identifier parameter is added to `submitContactForm()`; its signature is unchanged.
- **Limit policy:** Maximum **5** submissions per **60,000 ms**, as a **sliding** window. Expressed as hardcoded exported constants `CONTACT_RATE_LIMIT_MAX = 5` and `CONTACT_RATE_LIMIT_WINDOW_MS = 60_000`. Not configurable via env var or options parameter (hardcoded was explicitly chosen over env vars).
- **Rejection surface:** *Throw* a new typed error `ContactRateLimitError extends Error`, mirroring `ContactValidationError` (`scripts/contact.ts:8-15`). It carries `retryAfterMs`, `limit`, and `windowMs`. It is thrown after `validateContact()` passes and before `fetch`, so no Slack call occurs for a rejected submission.
- **State model:** *In-memory only* — a module-level array of accepted-submission timestamps. No file or DB persistence, no new dependency. A fresh process starts empty.

**Decisions made (with rationale):**

- **Sliding window over fixed window / token bucket** — A module-level `number[]` of accepted timestamps, pruned on each call, is the simplest correct sliding-window implementation and needs no dependency. It mirrors the project's hand-rolled, zero-dependency style (e.g. the inline `EMAIL_RE` validation at `scripts/contact.ts:17-33`).
- **Record a slot when the check passes, before `fetch`, regardless of Slack's response** — This protects the webhook even if Slack returns an error or is slow; a failed Slack send still consumes quota. (An alternative — only counting HTTP 200s — would let a caller retry-storm a failing webhook.)
- **Order inside `submitContactForm()`: `SLACK_URL` check → `validateContact()` → rate-limit check → `fetch`** — Invalid submissions throw during validation and therefore never consume quota; only well-formed submissions that would actually be sent count against the limit.
- **Throw (not a synthetic 429 return)** — Chosen to mirror the existing `ContactValidationError` convention so callers handle both rejection types the same way (try/catch on typed errors). The `main()` CLI already try/catches and branches on error type.
- **Exported test helpers** — `enforceContactRateLimit(now = Date.now())` (pure check-and-record with an injectable clock) and `resetContactRateLimit()` are exported so tests can drive window logic deterministically without network or waiting 60 s, consistent with how `validateContact()` is unit-tested separately from the async send.

**Out of scope:**

- Persistent / cross-invocation / cross-process state (temp file, Redis, DB) — backlogged.
- Per-email keying, env-var or options-based configuration, and any HTTP layer / server / middleware.
- Any change to uncommitted working-tree files (e.g. `errorWatcher.ts`). This plan targets the committed version of `scripts/contact.ts`.

## Detailed Requirements

### Functional

1. A new rate-limit gate rejects a submission once more than 5 accepted submissions have occurred within the trailing 60,000 ms, using a single global budget for the whole process.
2. Rejection is signalled by throwing `ContactRateLimitError`, which exposes `retryAfterMs` (ms until the oldest in-window submission expires, `0 < retryAfterMs <= 60_000`), `limit` (= 5), and `windowMs` (= 60_000).
3. A rejected submission makes **no** Slack `fetch` call.
4. Validation failures (`ContactValidationError`) and a missing `SLACK_URL` still take precedence and do **not** consume rate-limit quota.
5. The CLI `main()` prints a dedicated message for rate-limit rejection (`Rate limit exceeded: retry in <N>s`) and exits with code 1.
6. `resetContactRateLimit()` clears all recorded timestamps; `enforceContactRateLimit(now)` performs the check-and-record using the supplied clock value.

### Technical

- Implementation in `scripts/contact.ts` using Node built-ins only; **zero** new npm dependencies.
- Must pass `npm run typecheck` (`tsc --noEmit`, `strict: true`, `target ES2022`, `module ESNext` per `tsconfig.json`).
- Time measured with `Date.now()`; `enforceContactRateLimit` accepts an injectable `now` argument defaulting to `Date.now()` for testability.
- `submitContactForm()`'s signature and return shape (`Promise<{ status: number; body: string }>`) are unchanged.

### Non-Functional

- In-memory state; no persistence across process restarts; not shared across processes (accepted limitation, documented).
- No logging of `SLACK_URL` or message contents (preserve the existing secret-handling posture).
- Change is additive: existing validation, payload shape, return shape, and `SLACK_URL` parsing are untouched.

## Proposed Solution

Add a small sliding-window limiter to `scripts/contact.ts`:

- A module-level `const rateLimitTimestamps: number[] = []` holding timestamps of accepted submissions.
- `enforceContactRateLimit(now = Date.now())`: prune entries `<= now - CONTACT_RATE_LIMIT_WINDOW_MS`; if `rateLimitTimestamps.length >= CONTACT_RATE_LIMIT_MAX`, compute `retryAfterMs` from the oldest remaining timestamp and throw `ContactRateLimitError`; otherwise push `now`.
- `resetContactRateLimit()`: empty the array.
- `submitContactForm()` calls `enforceContactRateLimit()` after `validateContact(input)` and before `fetch`.
- `main()` gains a `ContactRateLimitError` catch branch.

The rate-limit gate sits inline in the single submission path, at the same point as the existing validation gate (`scripts/contact.ts:79`):

```
submitContactForm(input)
  └─ resolve SLACK_URL ........... throw Error if unset      (contact.ts:68-77)
  └─ validateContact(input) ...... throw ContactValidationError (contact.ts:79)
  └─ enforceContactRateLimit() ... throw ContactRateLimitError  (NEW — before fetch)
  └─ fetch(SLACK_URL, ...) ....... POST to Slack              (contact.ts:81-85)
  └─ return { status, body }
```

<details><summary><b>Implementation Detail</b></summary>

### Implementation Steps

#### Phase 1 — Add the limiter to `scripts/contact.ts`

1. **Add `ContactRateLimitError`** directly after `ContactValidationError` (after `scripts/contact.ts:15`), following that class's exact shape:

   ```ts
   export class ContactRateLimitError extends Error {
     retryAfterMs: number;
     limit: number;
     windowMs: number;
     constructor(retryAfterMs: number, limit: number, windowMs: number) {
       super(
         `Rate limit exceeded: max ${limit} submissions per ${Math.round(
           windowMs / 1000,
         )}s; retry in ${Math.ceil(retryAfterMs / 1000)}s`,
       );
       this.name = "ContactRateLimitError";
       this.retryAfterMs = retryAfterMs;
       this.limit = limit;
       this.windowMs = windowMs;
     }
   }
   ```

2. **Add exported constants and module-level state** (place near `EMAIL_RE`, `scripts/contact.ts:17`):

   ```ts
   export const CONTACT_RATE_LIMIT_MAX = 5;
   export const CONTACT_RATE_LIMIT_WINDOW_MS = 60_000;

   // Timestamps (ms) of accepted submissions within the current window.
   // Module-level and in-memory: resets when the process restarts and is not
   // shared across processes. Intended for a single long-lived caller.
   const rateLimitTimestamps: number[] = [];
   ```

3. **Add `enforceContactRateLimit` and `resetContactRateLimit`** (before `submitContactForm`):

   ```ts
   // Sliding-window check-and-record. Prunes expired timestamps, throws
   // ContactRateLimitError if the window is full, otherwise records `now`.
   export function enforceContactRateLimit(now: number = Date.now()): void {
     const windowStart = now - CONTACT_RATE_LIMIT_WINDOW_MS;
     // Drop timestamps at or before the window start (no longer counted).
     while (rateLimitTimestamps.length && rateLimitTimestamps[0] <= windowStart) {
       rateLimitTimestamps.shift();
     }
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

   // Clears all recorded submission timestamps (primarily for tests).
   export function resetContactRateLimit(): void {
     rateLimitTimestamps.length = 0;
   }
   ```

   Note on `retryAfterMs`: when the window is full, `oldest > windowStart` (it survived pruning), so `oldest + WINDOW_MS - now > 0`, and since `oldest <= now`, `retryAfterMs <= WINDOW_MS`. This guarantees `0 < retryAfterMs <= 60_000`.

4. **Call the gate inside `submitContactForm()`** — insert immediately after the existing validation call at `scripts/contact.ts:79`, before the `fetch` at line 81:

   ```ts
   validateContact(input); // throws ContactValidationError; no send on failure
   enforceContactRateLimit(); // throws ContactRateLimitError; no send when over limit
   ```

#### Phase 2 — CLI `main()` catch branch

5. In `main()` (`scripts/contact.ts:104-112`), add a `ContactRateLimitError` branch to the existing `catch`, before the generic `else`:

   ```ts
   } catch (err) {
     if (err instanceof ContactValidationError) {
       console.error("Validation failed:");
       for (const i of err.issues) console.error(`  - ${i}`);
     } else if (err instanceof ContactRateLimitError) {
       console.error(`Rate limit exceeded: retry in ${Math.ceil(err.retryAfterMs / 1000)}s`);
     } else {
       console.error(`Contact error: ${(err as Error).message}`);
     }
     process.exit(1);
   }
   ```

#### Phase 3 — Tests in `scripts/test-contact.ts`

6. **Update the import** (`scripts/test-contact.ts:1-6`) to pull in the new symbols:

   ```ts
   import {
     submitContactForm,
     validateContact,
     ContactValidationError,
     ContactRateLimitError,
     enforceContactRateLimit,
     resetContactRateLimit,
     CONTACT_RATE_LIMIT_MAX,
     CONTACT_RATE_LIMIT_WINDOW_MS,
     type ContactInput,
   } from "./contact.ts";
   ```

7. **Test 3 (new, live)** — add after Test 2 (`scripts/test-contact.ts:45`). Test 1 already consumed 1 slot in the shared in-process limiter. Send 4 more real submissions (total 5 within the window) asserting HTTP 200 each, then assert the 6th `submitContactForm()` throws `ContactRateLimitError` with `0 < retryAfterMs <= CONTACT_RATE_LIMIT_WINDOW_MS`:

   ```ts
   // Test 3: rate limit — the shared in-process limiter rejects the 6th send.
   // Test 1 already used 1 of 5 slots; send 4 more real messages to fill the window.
   for (let i = 2; i <= CONTACT_RATE_LIMIT_MAX; i++) {
     const { status } = await submitContactForm({
       name: "Test User",
       email: "test@example.com",
       subject: `Contact Us rate-limit fill ${i}/${CONTACT_RATE_LIMIT_MAX} — ${new Date().toISOString()}`,
       body: "Live rate-limit fill message.",
     });
     if (status !== 200) {
       console.error(`FAIL (rate limit fill ${i}): expected HTTP 200, got ${status}`);
       process.exit(1);
     }
   }
   try {
     await submitContactForm({
       name: "Test User",
       email: "test@example.com",
       subject: `Contact Us rate-limit overflow — ${new Date().toISOString()}`,
       body: "This submission must be rejected by the rate limiter.",
     });
     console.error("FAIL (rate limit): expected ContactRateLimitError, none thrown");
     process.exit(1);
   } catch (err) {
     if (
       err instanceof ContactRateLimitError &&
       err.retryAfterMs > 0 &&
       err.retryAfterMs <= CONTACT_RATE_LIMIT_WINDOW_MS
     ) {
       console.log(`PASS (rate limit): 6th send rejected, retry in ${Math.ceil(err.retryAfterMs / 1000)}s`);
     } else {
       console.error(`FAIL (rate limit): unexpected error ${(err as Error).message}`);
       process.exit(1);
     }
   }
   ```

   This test sends **5** real Slack messages per run (Test 1 + 4 fills); the 6th is rejected with no network call.

8. **Test 4 (new, no network)** — add after Test 3. Use the injectable clock to prove window-full rejection and expiry without waiting or hitting Slack:

   ```ts
   // Test 4: sliding-window logic, no network — uses the injectable clock.
   resetContactRateLimit();
   const t = 1_000_000; // fixed logical clock value
   for (let i = 0; i < CONTACT_RATE_LIMIT_MAX; i++) {
     enforceContactRateLimit(t);
   }
   try {
     enforceContactRateLimit(t);
     console.error("FAIL (window): expected ContactRateLimitError on the 6th call");
     process.exit(1);
   } catch (err) {
     if (!(err instanceof ContactRateLimitError)) {
       console.error(`FAIL (window): unexpected error ${(err as Error).message}`);
       process.exit(1);
     }
   }
   // After a full window elapses, the budget frees up again.
   enforceContactRateLimit(t + CONTACT_RATE_LIMIT_WINDOW_MS);
   console.log("PASS (window): 6th call blocked, succeeds after window expiry");
   resetContactRateLimit();
   ```

   Note: because Test 4 calls `resetContactRateLimit()` at the start, it is independent of the live Tests 1/3 state; the trailing reset leaves the limiter clean.

#### Phase 4 — Typecheck

9. Run `npm run typecheck` and confirm it is clean under strict mode.

### Edge Cases

- **Window full with `retryAfterMs` bounds:** Guaranteed `0 < retryAfterMs <= 60_000` by the pruning invariant (see note in Phase 1, step 3). Tests assert these bounds.
- **Exactly-at-boundary pruning:** A timestamp exactly equal to `now - WINDOW_MS` is treated as expired (`<= windowStart`), so after exactly `WINDOW_MS` a freed slot is available — asserted by Test 4's `t + CONTACT_RATE_LIMIT_WINDOW_MS` call.
- **Validation failure before the gate:** Malformed input throws `ContactValidationError` at `scripts/contact.ts:79` and never reaches `enforceContactRateLimit`, so it consumes no quota.
- **Missing `SLACK_URL`:** Throws before validation and the gate (`scripts/contact.ts:77`); consumes no quota.
- **Slack returns non-200:** The slot was already recorded before `fetch`, so a failing Slack response still counts toward the limit (intentional webhook protection).
- **Fresh CLI process:** Starts with an empty array; `npm run contact` (single send) never trips the limit. Documented limitation.

### Technical Considerations

- **Dependencies:** None added. `package.json` stays at zero runtime dependencies (dev deps `tsx`, `typescript`, `@types/node` unchanged).
- **Config:** No new env vars or options; limits are hardcoded exported constants.
- **Concurrency:** Node is single-threaded for this synchronous check-and-record; `enforceContactRateLimit` runs to completion before any `await`, so there is no interleaving race within the gate.
- **Security:** No new logging of secrets or message content. The error message contains only the numeric limit/window/retry values, not submission data.
- **Type-safety:** All new code is fully typed; no `any`. Compatible with `strict`, ES2022, ESNext (`tsconfig.json`).

### Security Considerations

- The limiter reduces the blast radius of a runaway loop or abusive caller flooding the Slack webhook within one process.
- It does **not** defend against distributed / multi-process abuse (no shared store) — explicitly out of scope and documented as a limitation.

### Dependencies & Related Work

- Builds directly on the existing contact feature introduced in commit `be432f3` ("Add a Contact Us Submission Feature that Posts to Slack via `SLACK_URL`").
- Related backlog item: persistent, cross-invocation rate-limit state (temp file or external store) — deferred.
- **Repo drift note:** The Understanding's line references are against the snapshot commit `5297643`. The current checkout (`dc2de53`) only adds planning commits on top; `scripts/contact.ts`, `scripts/test-contact.ts`, and `README.md` are unchanged, so all `file:line` references in this plan are valid as written. Any uncommitted working-tree changes (e.g. `errorWatcher.ts`) are out of scope.

</details>

## Testing Strategy

- **Unit (no network) — Test 4 in `scripts/test-contact.ts`:** `resetContactRateLimit()`, call `enforceContactRateLimit(t)` 5 times at a fixed clock `t`, assert the 6th throws `ContactRateLimitError`, then assert `enforceContactRateLimit(t + 60_000)` succeeds. Proves sliding-window fill and expiry deterministically, without waiting 60 s or hitting Slack.
- **Integration / live — Test 3 in `scripts/test-contact.ts`:** With Test 1 having already used 1 slot, send 4 more real submissions (asserting HTTP 200 each) to fill the window, then assert the 6th `submitContactForm()` throws `ContactRateLimitError` with `0 < retryAfterMs <= 60_000`. Total **5** real Slack messages per run.
- **Regression:** Tests 1 and 2 remain unchanged and must still pass (live happy-path send; validation rejection with no network).
- **Type-check:** `npm run typecheck` must stay clean under strict mode.
- **Manual:** `npm run contact` (single send) must still succeed and print `Contact submitted to Slack (HTTP 200)` — a single invocation never trips the limit. `npm run test:contact` must print `ALL PASS` and exit 0.

## Documentation Updates

Update `README.md`:

- **API section (`README.md:68-79`):** Add a `class ContactRateLimitError extends Error` bullet (carries `retryAfterMs`, `limit`, `windowMs`), and note that `submitContactForm(input)` now enforces a global in-process limit of 5 submissions per 60 s, throwing `ContactRateLimitError` (no Slack call) when exceeded.
- **Notes section (`README.md:81-85`):** Document that the limit is in-memory and per-process — it resets on restart and is not shared across processes, so one-shot CLI runs never trip it; it targets a long-lived caller.
- **Live-test description (`README.md:46-60`):** Update to reflect that `npm run test:contact` now sends **5** real messages and runs Tests 3 (live rate-limit rejection) and 4 (no-network window logic) in addition to Tests 1 and 2.

## Acceptance Criteria

1. `scripts/contact.ts` exports `ContactRateLimitError`, `enforceContactRateLimit`, `resetContactRateLimit`, `CONTACT_RATE_LIMIT_MAX` (= 5), and `CONTACT_RATE_LIMIT_WINDOW_MS` (= 60_000).
2. Within one process, the 6th `submitContactForm()` call inside any 60 s window throws `ContactRateLimitError` and makes **no** `fetch` call; the error's `retryAfterMs` satisfies `0 < retryAfterMs <= 60_000`.
3. The rate-limit check runs after `validateContact()` and before `fetch`; invalid input and missing `SLACK_URL` consume no quota.
4. A recorded slot persists even if the Slack `fetch` returns a non-200 (quota is consumed when the gate passes, before the send).
5. `main()` prints `Rate limit exceeded: retry in <N>s` and exits 1 when a rate-limit rejection occurs.
6. `scripts/test-contact.ts` includes the live Test 3 and no-network Test 4 described above; `npm run test:contact` prints `ALL PASS` and exits 0 (sending exactly 5 real Slack messages).
7. `npm run typecheck` passes cleanly under strict mode.
8. `submitContactForm()`'s signature and `{ status, body }` return shape are unchanged; Tests 1 and 2 still pass.
9. No new npm dependencies are added; `package.json` runtime-dependency count stays at zero.
10. `README.md` documents the new error, the limit policy, the in-memory/per-process limitation, and the updated live-test behavior.
