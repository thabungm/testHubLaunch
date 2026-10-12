# Add in-memory rate limiting to contact form submissions

## Plan Summary

- **What / why:** Throttle how often `submitContactForm()` (`scripts/contact.ts:65`) actually POSTs to the Slack webhook, so a burst of submissions cannot flood the channel. The limiter gates the real network send, not just validation.
- **Key decisions:** Global key (one shared budget for all submissions in the process), hardcoded **5 submissions per 60,000 ms** sliding window, in-memory/process-local state only, and a new thrown `ContactRateLimitError` (mirroring `ContactValidationError`). No new npm dependency, no env-var/options configuration, no HTTP layer.
- **Most important file:** `scripts/contact.ts` — all limiter logic lives here. Tests extend `scripts/test-contact.ts`; docs update `README.md`.
- **Priority / complexity:** Medium priority, low–medium complexity. Purely additive; existing validation, payload shape, `{ status, body }` return, and `SLACK_URL` handling are unchanged.

## Problem Statement

The contact feature is a single headless function, `submitContactForm(input)` in `scripts/contact.ts:65-87`. It resolves `SLACK_URL` from the environment, validates the input, then `fetch`-POSTs a Slack Block Kit message to the webhook and returns `{ status, body }`. There is **no** throttle: a caller invoking the function in a tight loop would send an unbounded number of messages to the Slack channel. We need a rate limit that rejects submissions exceeding an allowed rate *before* they reach Slack.

The repository is deliberately minimal: an ESM TypeScript project with **zero runtime dependencies** (only `tsx`, `typescript`, `@types/node` as dev deps — `package.json`), `strict: true` type-checking (`tsconfig.json`), and no web server, router, middleware, Redis, database, or cache anywhere. The build is `tsc --noEmit` (`scripts/build.mjs`). That constraint shapes the entire design: the limiter must be hand-rolled with Node built-ins only.

#### Planning Context

**Key requirements (confirmed):**
- The limiter gates the actual Slack `fetch` send inside `submitContactForm()` — not merely `validateContact()`.
- **Key:** Global. One shared limit across all submissions in the process, regardless of `email` or any other field. No new caller-supplied identifier parameter; the `submitContactForm(input)` signature is unchanged.
- **Policy:** Maximum **5** submissions per **60,000 ms**, as a **sliding window**. Hardcoded constants `CONTACT_RATE_LIMIT_MAX = 5` and `CONTACT_RATE_LIMIT_WINDOW_MS = 60_000`. Not configurable via env var or options.
- **Rejection surface:** Throw a new typed error `ContactRateLimitError extends Error`, mirroring `ContactValidationError` (`scripts/contact.ts:8-15`). It carries `retryAfterMs`, `limit`, `windowMs`. Thrown after `validateContact()` passes and before `fetch`, so no Slack call is made when over the limit.
- **State:** In-memory, module-level. A module-level `number[]` of accepted-submission timestamps. No file or DB persistence, no new dependency. A fresh CLI run starts empty.
- **Testability:** Export `enforceContactRateLimit(now = Date.now())` (pure check-and-record with injectable clock) and `resetContactRateLimit()`, plus the two constants.

**Decisions made & rationale:**
- *Global over per-email (Q1=A):* `ContactInput` (`scripts/contact.ts:1-6`) carries no client identifier (no IP/session/token/user id); `email` is the only submission-derived key. A global budget is the simplest correct choice and avoids changing the function signature.
- *Hardcoded 5/60s over env/options (Q2=A):* The allowed rate is a product decision with no basis in the code. The user chose fixed constants over env-var configuration for simplicity.
- *Throw over synthetic 429 (Q3=A):* The module already has a typed-error convention (`ContactValidationError`). A thrown `ContactRateLimitError` keeps "rejected before send" distinct from "Slack returned a status", and lets the CLI handle it explicitly.
- *In-memory over persistence (Q4=A):* There is no store and zero runtime deps. In-process state is the natural implementation. It is understood that one-shot CLI runs each start a fresh process, so cross-invocation limiting does not apply; this limiter is intended for a future long-running caller.

**Out of scope:**
- Persistent cross-invocation store (file/temp/Redis) — backlogged.
- Per-email keying, env-var / options configuration, any HTTP layer, allowlist/bypass.
- Any changes to the uncommitted `errorWatcher.ts` in the working tree. This plan is cut from `main` (commit `5297643`); all line references are to the committed version.

## Detailed Requirements

**Functional**
1. When fewer than 5 submissions have been accepted in the trailing 60,000 ms, `submitContactForm()` behaves exactly as today (validate → POST → return `{ status, body }`) and the accepted send is recorded.
2. When 5 submissions have already been accepted within the trailing 60,000 ms, the next call throws `ContactRateLimitError` *after* `validateContact()` passes and *before* `fetch`, so no Slack request is made and no 6th slot is recorded.
3. Invalid submissions (those that fail `validateContact`) must **not** consume quota — the validation throw happens before the rate-limit check.
4. A slot is recorded when the rate-limit check passes, *before* `fetch`, regardless of the Slack HTTP response. This protects the webhook even when Slack errors or is slow.
5. `ContactRateLimitError` exposes `retryAfterMs` (> 0, ≤ 60,000), `limit` (5), and `windowMs` (60,000), with a human-readable message.
6. The CLI `main()` prints a dedicated rate-limit message and exits `1` when the limiter rejects.

**Technical**
- Implementation confined to `scripts/contact.ts` plus tests in `scripts/test-contact.ts` and docs in `README.md`.
- Zero new npm dependencies; Node built-ins only (`Date.now()`).
- Must pass `npm run typecheck` (`tsc --noEmit`, strict).
- `submitContactForm(input)` signature unchanged; existing exports unchanged.

**Non-Functional**
- Sliding-window logic is O(n) in the number of timestamps retained (≤ ~5 under normal operation after pruning), negligible cost.
- Time read from the system clock via `Date.now()`; the exported pure helper accepts an injectable `now` for deterministic tests (no fake timers, no waiting 60 s).

## Proposed Solution

Add a module-level sliding-window limiter to `scripts/contact.ts`:

- A module-scoped array `submissionTimestamps: number[]` holds the epoch-ms times of accepted submissions.
- A pure, exported `enforceContactRateLimit(now = Date.now())` function:
  1. Prunes entries older than `now - CONTACT_RATE_LIMIT_WINDOW_MS`.
  2. If `submissionTimestamps.length >= CONTACT_RATE_LIMIT_MAX`, computes `retryAfterMs` from the oldest retained timestamp and throws `ContactRateLimitError`.
  3. Otherwise pushes `now` (records the slot) and returns.
- An exported `resetContactRateLimit()` that empties the array (for tests and future callers).
- `submitContactForm()` calls `enforceContactRateLimit()` *after* `validateContact(input)` and *before* `fetch`.
- `main()`'s catch block gains a `ContactRateLimitError` branch.

Because the whole feature is one function in one file, no architecture diagram is warranted. The ordering inside `submitContactForm()` is the only cross-cutting concern:

```
submitContactForm(input)
  1. resolve SLACK_URL (throw if unset)      # unchanged
  2. validateContact(input)                  # unchanged — invalid input never consumes quota
  3. enforceContactRateLimit()               # NEW — throws ContactRateLimitError if over limit; else records slot
  4. fetch(SLACK_URL, ...) → { status, body} # unchanged — reached only when a slot was recorded
```

<details><summary><b>Implementation Detail</b></summary>

## Implementation Steps

### Phase 1 — Limiter core in `scripts/contact.ts`

All additions go in `scripts/contact.ts`. Place the new error class next to `ContactValidationError` (currently `scripts/contact.ts:8-15`) to keep the two typed errors together, and place the constants + state + helpers after `validateContact()` (ends at `scripts/contact.ts:33`), before `esc()` / `buildSlackPayload()`.

1. **Add `ContactRateLimitError`**, mirroring `ContactValidationError` (`scripts/contact.ts:8-15`):

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

2. **Add the constants and state:**

   ```ts
   export const CONTACT_RATE_LIMIT_MAX = 5;
   export const CONTACT_RATE_LIMIT_WINDOW_MS = 60_000;

   // Epoch-ms timestamps of accepted submissions, newest last. Process-local;
   // a fresh process (e.g. each CLI run) starts empty. Not persisted.
   const submissionTimestamps: number[] = [];
   ```

3. **Add the pure check-and-record helper** (injectable clock for tests):

   ```ts
   export function enforceContactRateLimit(now: number = Date.now()): void {
     const cutoff = now - CONTACT_RATE_LIMIT_WINDOW_MS;
     // Prune entries that have fallen out of the sliding window.
     while (submissionTimestamps.length && submissionTimestamps[0] <= cutoff) {
       submissionTimestamps.shift();
     }
     if (submissionTimestamps.length >= CONTACT_RATE_LIMIT_MAX) {
       // The oldest retained slot frees up once it exits the window.
       const retryAfterMs = submissionTimestamps[0] + CONTACT_RATE_LIMIT_WINDOW_MS - now;
       throw new ContactRateLimitError(
         retryAfterMs,
         CONTACT_RATE_LIMIT_MAX,
         CONTACT_RATE_LIMIT_WINDOW_MS,
       );
     }
     submissionTimestamps.push(now);
   }

   export function resetContactRateLimit(): void {
     submissionTimestamps.length = 0;
   }
   ```

   Notes:
   - Prune uses `<= cutoff` so a timestamp exactly `windowMs` old is treated as expired — this makes `enforceContactRateLimit(t + 60_000)` succeed after 5 calls at `t` (the Test 4 assertion).
   - `retryAfterMs` is guaranteed `> 0` and `<= CONTACT_RATE_LIMIT_WINDOW_MS` whenever the error is thrown, because the oldest retained timestamp is strictly newer than `cutoff`.

4. **Insert the check in `submitContactForm()`** immediately after `validateContact(input)` (currently `scripts/contact.ts:79`) and before the `fetch` (currently `scripts/contact.ts:81`):

   ```ts
   validateContact(input); // throws ContactValidationError; no send on failure
   enforceContactRateLimit(); // throws ContactRateLimitError; records a slot on success
   ```

5. **Extend `main()`'s catch block** (currently `scripts/contact.ts:104-112`) with a dedicated branch, before the generic `else`:

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

### Phase 2 — Tests in `scripts/test-contact.ts`

Follow the existing live-e2e convention (`scripts/test-contact.ts:1-52`): no `fetch` stubbing; a real send for the network path, and the pure helper for the window-expiry path.

1. **Update the import** (`scripts/test-contact.ts:1-6`) to add `ContactRateLimitError`, `enforceContactRateLimit`, and `resetContactRateLimit` from `./contact.ts`.
2. **Test 1 and Test 2:** unchanged.
3. **Test 3 (new, live) — after Test 2, before the final `ALL PASS`:** Test 1 already recorded 1 accepted send this process. Send **4 more** real submissions via `submitContactForm()` (total 5 within the window), asserting HTTP 200 each. Then a **6th** `submitContactForm()` call must throw `ContactRateLimitError` with `0 < retryAfterMs <= 60_000`. This sends **5 real Slack messages per run total** (1 from Test 1 + 4 here). Use a timestamped subject like Test 1 so the messages are easy to find.
4. **Test 4 (new, no network):** Call `resetContactRateLimit()`. Call `enforceContactRateLimit(t)` 5 times with a fixed `t` (e.g. a literal like `1_000_000`). Assert the 6th `enforceContactRateLimit(t)` throws `ContactRateLimitError`. Then assert `enforceContactRateLimit(t + CONTACT_RATE_LIMIT_WINDOW_MS)` succeeds (window expiry), proving the sliding window without waiting 60 s or hitting Slack. Call `resetContactRateLimit()` at the start so Test 3's accepted sends do not pollute this test.

   Note the ordering dependency: Test 3 depends on the shared module-level state seeded by Test 1, so Test 4 must `resetContactRateLimit()` first and Test 3 must run before any reset.

### Phase 3 — Docs in `README.md`

1. In the **API** section (`README.md:68-79`), add a bullet for `ContactRateLimitError` (mirroring the `ContactValidationError` bullet at `README.md:71`) and a bullet/clause on `submitContactForm` noting it is rate-limited to 5 submissions per 60 s (sliding window) and throws `ContactRateLimitError` when exceeded.
2. Add a short **Notes** bullet (`README.md:81-85`) stating the limit is **in-memory and per-process** — it resets on each process start, so it does not throttle across separate CLI invocations and is intended for a long-running caller.
3. Update the **Live test** description (`README.md:52-57`) to reflect **5 real Slack messages per run** and the two new tests (Test 3 live over-limit; Test 4 no-network window expiry).

## Edge Cases

- **Invalid input never consumes quota:** `validateContact` throws before `enforceContactRateLimit`, so malformed submissions do not fill the window.
- **Slack error after a recorded slot:** the slot is recorded before `fetch`; a Slack 4xx/5xx or network error still counts against the budget (intended — protects the webhook).
- **`retryAfterMs` bounds:** always `> 0` and `<= 60_000` when thrown, since the oldest retained timestamp is strictly within the window.
- **Boundary at exactly `windowMs`:** a timestamp exactly `now - windowMs` old is pruned (`<= cutoff`), so a slot frees up precisely at the window edge — matches the Test 4 `t + 60_000` success assertion.
- **Fresh process:** each CLI run starts with an empty array, so a single `npm run contact` (1 send) never trips the limit.

## Error Handling

- Over-limit → `ContactRateLimitError` (new typed error), surfaced to callers; CLI prints `Rate limit exceeded: retry in <N>s` and exits `1`.
- Existing error paths unchanged: unset `SLACK_URL` → generic `Error` (`scripts/contact.ts:77`); invalid input → `ContactValidationError` (`scripts/contact.ts:32`).

## Testing

See Phase 2. Summary of coverage:
- **Unit / no-network:** Test 4 drives `enforceContactRateLimit` with an injectable clock — proves the 6th call throws and that expiry frees a slot. Deterministic, no timers, no network.
- **Integration / live:** Test 3 performs 4 additional real Slack sends (5 total with Test 1) and asserts the 6th throws.
- **Type safety:** `npm run typecheck` must stay clean under `strict`.

## Config

None. The limit is hardcoded via `CONTACT_RATE_LIMIT_MAX` / `CONTACT_RATE_LIMIT_WINDOW_MS`; no env vars or options are introduced. `SLACK_URL` handling (`scripts/contact.ts:68-77`) is untouched.

## Security

- No secret handling changes; `SLACK_URL` is still read from `process.env` only and never logged.
- The limiter reduces the blast radius of accidental or abusive bursts against the Slack webhook from a long-running caller.

## Dependencies & Related Work

- **No new dependencies.** Consistent with the zero-runtime-dependency stance (`package.json`).
- **Related:** the original "Contact Us → Slack" feature (commit `be432f3`) explicitly listed rate limiting as out of scope; this plan adds it.
- **Backlogged:** persistent cross-invocation limiting (file/temp/Redis) for the one-shot CLI usage pattern.
- **Repo drift check:** verified against the current checkout — `scripts/contact.ts`, `scripts/test-contact.ts`, and `README.md` match the `main` snapshot (commit `5297643`) the Understanding was built from; all line references above are current. The only working-tree difference is uncommitted `errorWatcher.ts`, which is unrelated and out of scope.

</details>

## Acceptance Criteria

1. `submitContactForm()` accepts the first 5 submissions within any trailing 60,000 ms window (POSTing to Slack and returning `{ status, body }` as before) and throws `ContactRateLimitError` on the 6th, with no `fetch` for the rejected call.
2. The rate-limit check runs **after** `validateContact()` and **before** `fetch` in `scripts/contact.ts`; invalid submissions do not consume quota.
3. `ContactRateLimitError` is exported, extends `Error`, has `name === "ContactRateLimitError"`, and carries `retryAfterMs` (`> 0`, `<= 60_000`), `limit === 5`, `windowMs === 60_000`.
4. `CONTACT_RATE_LIMIT_MAX` (`=5`), `CONTACT_RATE_LIMIT_WINDOW_MS` (`=60_000`), `enforceContactRateLimit(now?)`, and `resetContactRateLimit()` are exported from `scripts/contact.ts`.
5. `scripts/test-contact.ts` includes Test 3 (live: 4 further real sends then a thrown `ContactRateLimitError` on the 6th call) and Test 4 (no-network: 5 `enforceContactRateLimit(t)` calls, 6th throws, `enforceContactRateLimit(t + 60_000)` succeeds); `npm run test:contact` sends exactly 5 real Slack messages and prints `ALL PASS`.
6. `main()` prints `Rate limit exceeded: retry in <N>s` and exits `1` when the limiter rejects.
7. `npm run typecheck` passes with no errors (strict).
8. No new npm dependency is added; `package.json` dependencies are unchanged.
9. `README.md` documents the new error, the 5-per-60 s in-memory/per-process limit, and the updated live-test behavior (5 real messages; Tests 3 and 4).
