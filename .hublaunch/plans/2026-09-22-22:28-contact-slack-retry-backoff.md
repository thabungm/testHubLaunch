# Add Retry-With-Backoff to the Contact-Form Slack Send

## Plan Summary

- **What/why**: `submitContactForm()` in `scripts/contact.ts` sends the contact submission to Slack with a single, unretried `fetch` call. A transient failure (network blip, Slack returning a 5xx, or a 429 rate-limit) currently fails the whole submission on the first hiccup, with no second chance. This plan adds bounded retry-with-exponential-backoff around the Slack POST, retrying only on transient failures and never on validation or permanent (4xx) failures.
- **Key decision**: Retry lives entirely inside `submitContactForm()` in `contact.ts` — no new file, no new exported helper — because it is the only call site of the Slack `fetch` in this repo, and the retry loop needs direct access to the same `url`/payload already built there.
- **Most important file**: `scripts/contact.ts` — the `submitContactForm()` function gains the retry loop; `scripts/test-contact.ts` gains a new retry-specific test.
- **Priority/complexity**: Medium priority (this repo is a test fixture, not production-critical, but the retry behavior itself should be correct since other HubLaunch test flows depend on this script succeeding), Simple complexity (one function modified, one new test, no new dependencies, no new files).

### 2. Problem Statement

`scripts/contact.ts`'s `submitContactForm()` performs exactly one `fetch` POST to the Slack Incoming Webhook URL in `SLACK_URL` and returns whatever HTTP status/body comes back (or throws whatever the `fetch` call itself throws, e.g. a DNS/network error). There is no retry. A single transient failure — a dropped connection, a momentary Slack 500, or a 429 rate-limit response — currently surfaces as a hard failure to the caller (`main()` in `contact.ts` logs it and calls `reportErrorToHula()`; `test-contact.ts`'s live test simply fails) even though a second attempt a moment later would very likely succeed.

#### Planning Context

**Key Requirements Discussed:**

- Retry must be bounded (a fixed maximum number of attempts) — never retry forever.
- Retry must distinguish transient failures (network/connection errors thrown by `fetch` itself, and HTTP 429 or any 5xx status) from permanent ones (any other HTTP status, e.g. 4xx) — only the former are retried.
- Validation failures (`ContactValidationError`, thrown by `validateContact()` before any network call happens) must continue to never trigger a network call at all, retried or not — this is existing, tested behavior (`test-contact.ts`'s "Test 2: validation") that must not change.
- The existing live end-to-end test (`test-contact.ts`'s "Test 1: live happy path", which performs a real Slack send) and the existing CLI smoke test (`scripts/contact.ts`'s `main()`) must continue to behave identically on the happy path — a successful first attempt must not be delayed or altered by the new retry logic.
- Retry attempts and backoff delays must be observable in logs (so a real failure sequence is diagnosable), but must not change the function's return type or its thrown-error types — callers (`main()` in `contact.ts`, and any future caller) see the exact same `Promise<{ status: number; body: string }>` success shape or the exact same thrown-error types (`ContactValidationError` for validation, a plain `Error` for "give up after final attempt") as today.

**Decisions Made:**

- **Exponential backoff with a fixed base and cap**: delays double each attempt starting from a base delay, up to 3 total attempts (1 initial + 2 retries). Chosen over a fixed-delay retry because exponential backoff is the standard mitigation for both transient network blips (short delay is enough) and rate-limiting (429 responses benefit from a longer wait before the next attempt) without needing to parse a `Retry-After` header (Slack's Incoming Webhook 429 responses do not reliably include one, so this plan does not depend on it).
- **3 total attempts, base delay 500ms** (so delays are 500ms then 1000ms between attempts 1→2 and 2→3): chosen as a sensible default for a synchronous CLI/test script — enough to absorb a brief blip without making `npm run contact` or `npm run test:contact` noticeably slow to fail on a genuinely broken `SLACK_URL` (worst case ~1.5s of added delay before the final failure, versus retrying indefinitely or with much longer delays).
- **Configurable via optional environment variables, not function parameters**: `CONTACT_RETRY_MAX_ATTEMPTS` and `CONTACT_RETRY_BASE_DELAY_MS`, both optional with the defaults above. Environment variables were chosen over adding parameters to `submitContactForm(input)` because that function's signature is part of this repo's small public contract (imported by `test-contact.ts` and called by `main()`) and every existing call site should keep working unchanged; env vars let the retry behavior be tuned (e.g. disabled by setting max attempts to 1, for a test that wants to assert exact single-attempt behavior) without touching any call site.
- **No retry on 4xx**: a 4xx response (other than 429) means the request itself was rejected (e.g. a malformed payload, an invalidated webhook URL) — retrying it would just fail the same way again, so only 429 and 5xx are treated as retryable HTTP statuses. A thrown network error (e.g. `fetch` rejecting with `TypeError: fetch failed`) is always treated as retryable, since there is no status code to inspect.

**Out of Scope:**

- Reading or respecting a `Retry-After` header on a 429 response — Slack's Incoming Webhook responses do not reliably provide one; this plan uses a fixed exponential schedule regardless of response headers.
- Any change to `validateContact()`, `buildSlackPayload()`, `esc()`, or the `ContactValidationError` class — none of these are touched.
- Any change to `errorWatcher.ts` / `reportErrorToHula()` — the existing call to it in `contact.ts`'s `main()` catch block continues to fire only after all retry attempts are exhausted, with no change to its own signature or behavior.
- A circuit-breaker or persistent failure-tracking mechanism across separate script invocations — each `submitContactForm()` call's retry state is local to that one call, nothing is persisted between runs.

#### Background & Context

- **Why is this needed?** This repo exists specifically as a HubLaunch end-to-end test fixture — other automated flows depend on `npm run contact` / `npm run test:contact` succeeding reliably. A single transient Slack hiccup currently causes a full, avoidable failure.
- **What's the current state?** `submitContactForm()` (`scripts/contact.ts:67-89`) makes exactly one `fetch` call with no retry of any kind.
- **What pain point does this address?** Spurious failures from transient network/Slack issues that a simple retry would have absorbed.
- **Who is affected?** Anyone running `npm run contact` or `npm run test:contact` in this repo, and any automated flow that shells out to either.

**Current Behavior**:

- One `fetch` attempt. Any thrown error propagates immediately to the caller. Any HTTP response (including 429/5xx) is returned immediately as-is, with no retry.

**Desired Behavior**:

- Up to 3 total attempts. A thrown network error or an HTTP 429/5xx response triggers a retry after an exponential backoff delay (500ms, then 1000ms). A successful response (any non-429, non-5xx status — including "successful" 4xx-as-in-client-error cases, which are not retried) or exhausting all attempts returns/throws exactly as `submitContactForm()` does today, just potentially after one or two internal retries the caller never has to know about.

### 3. Detailed Requirements

#### Functional Requirements

1. **Retry loop inside `submitContactForm()`**
   - Wrap the existing `fetch` call (`scripts/contact.ts:83-87`) in a loop that attempts up to `maxAttempts` times (default 3, overridable via `CONTACT_RETRY_MAX_ATTEMPTS`).
   - On each attempt: if `fetch` itself throws (network error), treat as retryable. If `fetch` resolves, inspect `res.status`: `429` or `500-599` is retryable; anything else (including 2xx, 3xx, and non-429 4xx) returns immediately with `{ status: res.status, body: await res.text() }`, exactly as today.
   - Between a retryable failure and the next attempt, wait `baseDelayMs * 2^(attemptIndex)` milliseconds (attemptIndex starting at 0 for the delay before the 2nd attempt, 1 for the delay before the 3rd attempt) — i.e. with the default `baseDelayMs=500`, delays are 500ms then 1000ms. Default `baseDelayMs` is overridable via `CONTACT_RETRY_BASE_DELAY_MS`.
   - Edge case: if the final attempt (`attemptIndex === maxAttempts - 1`) is itself retryable (thrown error or 429/5xx), do not wait again — either re-throw the last thrown error, or return the last HTTP response's `{ status, body }` as-is (do NOT synthesize a new error for a final 429/5xx — the existing contract is that `submitContactForm()` returns whatever status Slack gave it; only a thrown `fetch` error was ever an actual `throw` before this change, and that stays true).

2. **Environment-variable overrides, both optional with defaults**
   - `CONTACT_RETRY_MAX_ATTEMPTS`: parsed as a positive integer; default `3` if unset, empty, or not a valid positive integer (invalid values fall back to the default rather than throwing — this is a test-fixture script, a malformed env var should degrade gracefully, not crash a CLI smoke test).
   - `CONTACT_RETRY_BASE_DELAY_MS`: parsed as a non-negative integer; default `500` if unset, empty, or not a valid non-negative integer (same graceful-fallback reasoning).

3. **Logging each retry**
   - On each retryable failure that will be followed by another attempt, log a single line to `console.error` (matching this file's existing `console.error` usage for failures, e.g. `scripts/contact.ts:104`) in the form: `Contact send attempt ${n}/${maxAttempts} failed (${reason}); retrying in ${delayMs}ms...` where `reason` is either the caught error's `.message` or `HTTP ${status}` for a retryable response status.
   - Do not log anything extra on the final (non-retried) failure or on any success — `main()`'s existing success/failure logging (`scripts/contact.ts:100-105`) already covers the outcome; this requirement only covers the intermediate "retrying" lines.

#### Technical Requirements

- **Technology/Framework**: TypeScript, run via `tsx` (no build step for the scripts themselves — see `package.json`'s `contact`/`test:contact` scripts). No new npm dependency — use a plain `await new Promise(r => setTimeout(r, delayMs))` for the backoff wait, matching this repo's existing "no runtime npm dependencies" constraint (stated explicitly in `README.md`: "No runtime npm dependencies — the Slack call uses the global `fetch`").
- **Location**: `scripts/contact.ts` (the retry loop) and `scripts/test-contact.ts` (the new test). No other file changes.
- **Dependencies**: None new.
- **Constraints**: `submitContactForm(input: ContactInput): Promise<{ status: number; body: string }>`'s exported signature and return type must not change — `test-contact.ts`'s existing two tests, and `main()` in `contact.ts`, must continue to work with zero changes to their own code.

#### Non-Functional Requirements

- **Performance**: Happy path (first attempt succeeds) has zero added latency — no delay is ever introduced before a successful or non-retryable response. Worst case (all 3 attempts fail with a retryable condition) adds up to ~1.5s (500ms + 1000ms) before the final result, versus today's immediate single-attempt failure.
- **Security**: None — no new inputs, no new secrets, no new external calls (the retry re-issues the exact same `fetch` request that already existed).
- **Backwards Compatibility**: Fully backwards compatible. A caller that never sets `CONTACT_RETRY_MAX_ATTEMPTS`/`CONTACT_RETRY_BASE_DELAY_MS` gets the new default retry behavior automatically; a caller wanting the exact old single-attempt behavior can set `CONTACT_RETRY_MAX_ATTEMPTS=1`.
- **Error Handling**: A thrown error on the final attempt is re-thrown as-is (same error object/type Slack's `fetch` call would have thrown today) — `main()`'s existing `catch` block (`scripts/contact.ts:106-114`), which distinguishes `ContactValidationError` from other errors and calls `reportErrorToHula()` for the latter, requires no changes.

### 4. Proposed Solution

**High-level approach**: Replace the single `await fetch(...)` call inside `submitContactForm()` with a small `for` loop of up to `maxAttempts` iterations, each iteration attempting the same `fetch` call, classifying the outcome as "return now" (success or non-retryable status) or "retry" (thrown error or 429/5xx status), and sleeping with exponential backoff between retryable failures.

```text
submitContactForm(input)
        │
        ▼
  validateContact(input)  ── throws ContactValidationError, no network, no retry (unchanged)
        │ ok
        ▼
  for attempt in 1..maxAttempts:
        │
        ▼
  fetch(url, ...)  ──throws──▶ retryable? ──yes──▶ last attempt? ──no──▶ sleep(backoff) ──▶ next attempt
        │ resolves                                      │ yes
        ▼                                                ▼
  status 429/5xx? ──yes──▶ (same retryable path as above)   re-throw the error
        │ no
        ▼
  return { status, body }   ← unchanged return shape, whichever attempt produced it
```

#### Key Components

1. **Retry loop** (`scripts/contact.ts`, inside `submitContactForm()`)
   - What changes: the single `const res = await fetch(...)` / `return { status: res.status, body: await res.text() }` pair becomes a `for` loop with the classify-and-maybe-retry logic described above.
   - Why this approach: keeps the retry logic co-located with the one place that needs it, with no new exported surface.
   - How it integrates: `validateContact(input)` (line 81) stays exactly where it is, before the loop — validation failures still never enter the retry loop at all.

2. **Env-var parsing helper** (`scripts/contact.ts`, new small local, non-exported function)
   - What changes: a small `parsePositiveIntEnv(name: string, fallback: number): number` (or similar) helper reads and validates `CONTACT_RETRY_MAX_ATTEMPTS`/`CONTACT_RETRY_BASE_DELAY_MS`.
   - Why this approach: both env vars need the identical "parse int, fall back to default on anything invalid" logic — one small local helper avoids duplicating that parsing twice.
   - How it integrates: called once each at the top of `submitContactForm()` (or as module-level constants read once — either is acceptable; reading them fresh inside `submitContactForm()` is preferable so a test can change `process.env` between calls within the same process, which the new retry test in Requirement 2 needs).

#### Files Likely to Change

- `scripts/contact.ts` — `submitContactForm()` gains the retry loop; one new small local parsing helper.
- `scripts/test-contact.ts` — one new test ("Test 3: retry") added after the existing two tests.
- `README.md` — one new subsection documenting the retry behavior and the two new environment variables.

#### Code Patterns to Follow

**Pattern References:**

- **For the existing `console.error` failure-logging style**: follow [`scripts/contact.ts:104`](scripts/contact.ts#L104) (`console.error(\`Contact send failed: HTTP ${status}, body: ${body}\`);`) — the new "retrying in Nms" log line should read in the same plain, single-line, no-prefix style already used throughout this file.
- **For the existing env-var read-with-fallback style**: follow [`scripts/contact.ts:70`](scripts/contact.ts#L70) (`let url = process.env.SLACK_URL?.trim() ?? "";`) — reads `process.env` directly with `?.` and a fallback, no external env-parsing library. The new `CONTACT_RETRY_*` reads should use the same direct-`process.env` style, just adding integer parsing and validation on top.
- **For the existing test style**: follow [`scripts/test-contact.ts`](scripts/test-contact.ts) end-to-end — each test is a plain `try`/`catch` block inside `run()`, printing `PASS (...)`/`FAIL (...)` and calling `process.exit(1)` immediately on any failure, with a final `console.log("ALL PASS"); process.exit(0);` only if every test ran without exiting early. The new "Test 3: retry" must follow this exact same shape — no test framework, no `describe`/`it`.
- **For stubbing `fetch` in the new test without a mocking library**: since this repo has no runtime/test dependencies (per `README.md`'s "No runtime npm dependencies"), the new retry test must stub the global `fetch` directly — save `const realFetch = globalThis.fetch;` before the test, assign a counting stub `globalThis.fetch = async (...) => { ... }` that fails the first N-1 times and succeeds on the last, run `submitContactForm()`, assert both the returned result AND the call count, then restore `globalThis.fetch = realFetch;` in a `finally` block so later tests (or a second run) are unaffected.

**Anti-Patterns to Avoid:**

- Don't add a runtime npm dependency (e.g. a retry library) — this repo explicitly has zero runtime dependencies today and the retry logic is simple enough not to need one.
- Don't change `submitContactForm`'s parameter list to accept retry options — use the environment-variable overrides described in Requirement 2 instead, so every existing call site (`main()`, `test-contact.ts`'s Test 1 and Test 2) keeps working with zero changes.
- Don't retry a `ContactValidationError` — it is thrown before the loop even starts and must stay that way; retrying validation would be nonsensical (the same invalid input would fail identically every time) and would also violate the existing, tested "validation rejects without sending to Slack" contract.

### 5. Implementation Steps

#### Phase 1: Retry loop in `contact.ts`

- [ ] In `scripts/contact.ts`, add a small local helper above `submitContactForm`:
  ```ts
  function parsePositiveIntEnv(name: string, fallback: number): number {
    const raw = process.env[name]?.trim();
    if (!raw) return fallback;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }
  ```
- [ ] Replace the body of `submitContactForm` from the `const res = await fetch(...)` line through the `return { status: res.status, body: await res.text() };` line (`scripts/contact.ts:83-88`) with:
  ```ts
  const maxAttempts = parsePositiveIntEnv("CONTACT_RETRY_MAX_ATTEMPTS", 3);
  const baseDelayMs = parsePositiveIntEnv("CONTACT_RETRY_BASE_DELAY_MS", 500);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSlackPayload(input)),
      });
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      console.error(
        `Contact send attempt ${attempt}/${maxAttempts} failed (${(err as Error).message}); retrying in ${delayMs}ms...`,
      );
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }

    const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599);
    if (!retryable || attempt === maxAttempts) {
      return { status: res.status, body: await res.text() };
    }
    const delayMs = baseDelayMs * 2 ** (attempt - 1);
    console.error(
      `Contact send attempt ${attempt}/${maxAttempts} failed (HTTP ${res.status}); retrying in ${delayMs}ms...`,
    );
    await new Promise((r) => setTimeout(r, delayMs));
  }
  // Unreachable: the loop always returns or throws by the final iteration.
  throw new Error("submitContactForm: exhausted retry attempts without a result");
  ```
  Note: `parsePositiveIntEnv("CONTACT_RETRY_BASE_DELAY_MS", 500)` reuses the same "positive int, fallback on anything invalid" helper as `CONTACT_RETRY_MAX_ATTEMPTS` per the Code Patterns section above — `0` is technically a valid non-negative delay a caller might want (e.g. a test forcing zero-wait retries), but Requirement 2 specifies a "non-negative integer" for this one specifically; adjust the helper call to accept `0` for this var only (e.g. `Number.isFinite(n) && n >= 0` inline, or a second helper) if a test needs a true zero-delay override — keep `CONTACT_RETRY_MAX_ATTEMPTS` strictly positive (`n > 0`) since zero attempts makes no sense.

#### Phase 2: New retry test in `test-contact.ts`

- [ ] Add "Test 3: retry" to `scripts/test-contact.ts`, after the existing "Test 2: validation" block and before the final `console.log("ALL PASS")`:
  ```ts
  // Test 3: retry — fails twice with a retryable error, succeeds on the 3rd attempt.
  {
    const realFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = (async (..._args: Parameters<typeof fetch>) => {
      callCount++;
      if (callCount < 3) {
        return new Response("service unavailable", { status: 503 });
      }
      return new Response("ok", { status: 200 });
    }) as typeof fetch;
    process.env.CONTACT_RETRY_BASE_DELAY_MS = "10"; // fast retry for the test
    try {
      const { status, body } = await submitContactForm({
        name: "Retry Test",
        email: "retry@example.com",
        subject: "Retry behavior test",
        body: "Exercises the retry loop with a stubbed fetch.",
      });
      if (status === 200 && body === "ok" && callCount === 3) {
        console.log(`PASS (retry): succeeded on attempt ${callCount} after 2 retryable failures`);
      } else {
        console.error(`FAIL (retry): status=${status} body=${body} callCount=${callCount}`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`FAIL (retry): unexpected throw: ${(err as Error).message}`);
      process.exit(1);
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.CONTACT_RETRY_BASE_DELAY_MS;
    }
  }
  ```
  This test does not require `SLACK_URL` to be a real webhook (the stub intercepts every `fetch` call regardless of URL), but the existing top-of-file guard (`scripts/test-contact.ts:9-12`) still requires `SLACK_URL` to be *set* before any test runs — leave that guard unchanged; the stub only needs `SLACK_URL` to be non-empty, not valid.

#### Phase 3: Documentation

- [ ] Add a new "## Retry behavior" subsection to `README.md`, after the existing "## Usage" section, documenting: the default 3-attempt/500ms-base-delay schedule, which conditions are retried (thrown network errors, HTTP 429, HTTP 5xx) versus not (any other status, and validation errors which never reach the network), and the two override env vars (`CONTACT_RETRY_MAX_ATTEMPTS`, `CONTACT_RETRY_BASE_DELAY_MS`) with their defaults.

#### Phase 4: Verify

- [ ] Run `npm run typecheck` — confirm no TypeScript errors.
- [ ] Run `npm run test:contact` (requires `SLACK_URL` set to a real webhook) — confirm all three tests (`PASS (live send)`, `PASS (validation)`, `PASS (retry)`) print, followed by `ALL PASS`, exit code 0.
- [ ] Run `npm run contact` — confirm the unchanged happy-path CLI smoke test still prints `Contact submitted to Slack (HTTP 200)` and exits 0, with no added delay (first attempt succeeds).

<details>
<summary><b>Implementation Detail</b></summary>

### 6. Edge Cases & Considerations

#### Edge Cases to Handle

1. **`CONTACT_RETRY_MAX_ATTEMPTS=1`**: the loop runs exactly once; any retryable failure on that single attempt is treated as the final attempt (per the `attempt === maxAttempts` check) and returned/thrown immediately, with no retry and no delay — equivalent to today's pre-this-plan behavior.
2. **Invalid env var values** (e.g. `CONTACT_RETRY_MAX_ATTEMPTS=abc` or `CONTACT_RETRY_MAX_ATTEMPTS=-5`): `parsePositiveIntEnv` falls back to the default (3) rather than throwing or producing `NaN`-driven loop behavior (e.g. a loop that never terminates or terminates immediately).
3. **All attempts exhausted with a thrown network error on every attempt**: the loop re-throws the *last* caught error on the final attempt — the caller sees the same error type/message a single unretried attempt would have produced today, just after the added retries.
4. **All attempts exhausted with a 5xx/429 response on every attempt**: the loop returns the *last* response's `{ status, body }` — never synthesizes a new thrown error for this case, preserving today's "HTTP failures are returned, not thrown" contract.

#### Potential Challenges

- ⚠️ **Test 3 runtime**: with `CONTACT_RETRY_BASE_DELAY_MS=10` (set inside the test itself), the two retry delays total ~30ms (10ms + 20ms) — negligible added test runtime. If this override were omitted, the test would use the real 500ms/1000ms default schedule (~1.5s), which still passes but slows the test suite unnecessarily; the override is why Phase 2's test explicitly sets it.
- ⚠️ **Global `fetch` stubbing side effects**: the `finally` block restoring `globalThis.fetch = realFetch` is required so Test 3 running before a hypothetical future test (or a second invocation within the same process) does not leave the stub in place. This mirrors why the test also explicitly `delete`s the env var override afterward.

#### Security Considerations

- None — no new inputs, no new secrets, no new external endpoints. The retry re-sends the identical request to the identical `SLACK_URL` already in use; no data is duplicated or exposed beyond what already occurs on a single successful send.

### 7. Technical Considerations

#### Dependencies

- None — no new npm packages, per this repo's existing "no runtime npm dependencies" constraint.

#### Configuration Changes

- None to `hublaunch.config.js` or any build config.

#### Environment Variables

- `CONTACT_RETRY_MAX_ATTEMPTS` — optional, positive integer, default `3`. Total number of attempts (1 initial + up to 2 retries with the default).
- `CONTACT_RETRY_BASE_DELAY_MS` — optional, non-negative integer, default `500`. Base delay in milliseconds for the exponential backoff schedule (`baseDelayMs * 2^(attempt-1)` between attempts).

#### API Rate Limiting

- This change is itself a mitigation for Slack's own rate limiting (429 responses) on the Incoming Webhook endpoint — retrying with backoff on a 429 is the standard, Slack-recommended mitigation pattern for webhook rate limits.

#### Error Handling Strategies

- Unchanged error *types*: `ContactValidationError` for invalid input (still thrown before any network call), a plain `Error`/whatever `fetch` itself throws for a final-attempt network failure. Only the *number of attempts* before either outcome changes.

### 8. Testing Requirements

#### Unit Tests

- [ ] Test `submitContactForm()` succeeds on the first attempt with no added delay (existing "Test 1: live happy path" already covers this — no new test needed, just confirm it still passes unchanged).
- [ ] Test `submitContactForm()` rejects invalid input without any network call (existing "Test 2: validation" already covers this — confirm it still passes unchanged).
- [ ] **New**: Test `submitContactForm()` retries on a 503 response and succeeds on the 3rd attempt (Phase 2's "Test 3: retry", using a stubbed `globalThis.fetch`).

#### Integration Tests

- [ ] `npm run test:contact` end-to-end, requiring a real `SLACK_URL` (per this repo's existing convention — Test 1 is already a live integration test against real Slack).

#### Manual Testing Checklist

1. **Setup**: `export SLACK_URL=<a valid Slack Incoming Webhook URL>` (or `set -a; source .env; set +a` if using a local `.env`).
2. **Test Case 1 — happy path unaffected**: Run `npm run contact`. Expected result: `Contact submitted to Slack (HTTP 200)`, exits 0, with no noticeable delay (first attempt succeeds).
3. **Test Case 2 — full suite including new retry test**: Run `npm run test:contact`. Expected result: `PASS (live send): ...`, `PASS (validation): ...`, `PASS (retry): ...`, then `ALL PASS`, exit code 0.
4. **Edge Case Testing**: Temporarily set `SLACK_URL` to an unreachable host (e.g. `https://localhost:1`) and run `npm run contact`. Expected result: after ~1.5s (the default 500ms+1000ms backoff), the script fails with the same style of error message `main()` already produces today (`Contact error: ...`), just after the retry attempts rather than immediately.

#### Test Data Requirements

- A valid `SLACK_URL` for the live-send tests (Test 1 and the manual checklist) — no new fixtures needed; the new "Test 3: retry" needs no real network access since it stubs `globalThis.fetch`.

### 9. Documentation Updates

#### User-Facing Documentation

- [ ] Add the "## Retry behavior" subsection to `README.md` as described in Phase 3.

#### Code Documentation

- [ ] No JSDoc changes required beyond what Phase 1's code already makes self-evident (short, direct variable names and the one inline comment already specified in Phase 1 for the `CONTACT_RETRY_BASE_DELAY_MS` zero-vs-positive nuance).

#### Examples to Include

```bash
# Example: force single-attempt (no retry) behavior, matching pre-this-plan behavior
CONTACT_RETRY_MAX_ATTEMPTS=1 npm run contact

# Example: faster backoff for local testing against a flaky network
CONTACT_RETRY_BASE_DELAY_MS=100 npm run contact
```

### 10. Acceptance Criteria

- [ ] **AC1**: `submitContactForm()` retries up to 2 additional times (3 total attempts by default) on a thrown network error or an HTTP 429/5xx response, with exponential backoff (500ms, then 1000ms by default) between attempts.
- [ ] **AC2**: `submitContactForm()` does NOT retry on any non-429, non-5xx HTTP response (e.g. 200, 400, 401) — returns immediately on the first attempt exactly as today.
- [ ] **AC3**: `validateContact()` failures (`ContactValidationError`) continue to never trigger any network call, retried or not.
- [ ] **AC4**: `CONTACT_RETRY_MAX_ATTEMPTS` and `CONTACT_RETRY_BASE_DELAY_MS` env vars override the defaults when set to valid values, and fall back to the defaults (3 and 500 respectively) when unset or invalid.
- [ ] **AC5**: The existing "Test 1: live happy path" and "Test 2: validation" tests in `test-contact.ts` pass unchanged.
- [ ] **AC6**: The new "Test 3: retry" test in `test-contact.ts` passes, proving a 503-then-503-then-200 sequence results in a successful `{ status: 200, body: "ok" }` return after exactly 3 `fetch` calls.
- [ ] **AC7**: `npm run typecheck` passes with no errors.
- [ ] **AC8**: `README.md` documents the retry behavior and both new environment variables.

#### Definition of Done

- All acceptance criteria met
- `npm run typecheck` and `npm run test:contact` both pass
- `README.md` updated
- No breaking changes to `submitContactForm`'s exported signature or return type

### 11. Dependencies & Related Work

#### Dependencies

- [ ] None — self-contained to this repo, two files changed plus README.

#### Blockers

- [ ] None.

#### Related Issues/PRs

- None — this is a standalone test-fixture improvement, not tied to any tracked issue in another repository.

</details>
