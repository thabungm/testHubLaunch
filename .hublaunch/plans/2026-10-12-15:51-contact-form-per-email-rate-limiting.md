# Add per-email rate limiting to contact form submissions

## Plan Summary

- **What / why.** Guard the public `submitContactForm()` path in `scripts/contact.ts` so a single sender email cannot flood the Slack webhook. A breach rejects the submission *before* any network call, mirroring the existing fail-fast `validateContact()` behavior.
- **Key decisions.** Limit **per normalized email** (`trim().toLowerCase()`), sliding window of **5 submissions / 60 s** (both env-overridable), **persisted to a JSON file** (`.contact-rate-limit.json` in `process.cwd()`, overridable via `CONTACT_RATE_LIMIT_FILE`), and a breach throws a **new `RateLimitError extends Error`**. Only sends that return HTTP 200 consume quota.
- **Most important files.** `scripts/contact.ts` (new limiter + `RateLimitError` + wiring into `submitContactForm()`), `scripts/test-contact.ts` (isolated counter file + new tests), `.gitignore` and `README.md` (new file + docs).
- **Constraints.** Zero runtime dependencies (Node `fs`/`os`/`path` built-ins only), ESM, must keep `tsc --noEmit` (strict) green. The live test and smoke script must not be permanently broken by the limiter.
- **Priority / complexity.** Medium priority, low–medium complexity: one self-contained module, a new error type, careful ordering around the existing `fetch`, and a small amount of env parsing + atomic file I/O.

## Problem Statement

`submitContactForm(input)` in `scripts/contact.ts:65` is the entire public surface of this headless "Contact Us" feature. It reads `SLACK_URL`, validates the input, then POSTs a Slack Block Kit message via the global `fetch`. There is currently **nothing** stopping the same caller from submitting arbitrarily many messages in a short period — every call that passes validation reaches Slack.

This change adds a rate limiter that caps how frequently a given sender (keyed by email) can submit, rejecting excess submissions before the webhook POST.

#### Planning Context

**Key requirements**

- Rate-limit **per email address**, normalized with `trim().toLowerCase()`. The feature is headless — README.md:6-8 confirms "submit" is a direct function call with no HTTP server, request object, IP, or session — so the sender email is the only identity available to key a limiter on.
- **Sliding window**: at most `CONTACT_RATE_LIMIT_MAX` (default **5**) submissions per `CONTACT_RATE_LIMIT_WINDOW_MS` (default **60000** ms) per email. Timestamps older than the window are pruned on each check.
- **Persist counter state to a JSON file** so the limit survives across separate, short-lived CLI processes (each `npm run contact` is a fresh process — see the direct-execution guard at `scripts/contact.ts:116`). Default path `.contact-rate-limit.json` resolved from `process.cwd()`, overridable via `CONTACT_RATE_LIMIT_FILE`. Node `fs` built-ins only; no DB, no new runtime deps.
- On breach, **throw a new typed `RateLimitError extends Error` immediately**, before any Slack POST — mirroring `ContactValidationError` (`scripts/contact.ts:8-15`). No delay, no queue, no silent skip.
- **Only successful sends count.** A timestamp is recorded only after the Slack POST returns HTTP 200; failed POSTs (non-200, network errors) do not consume quota.
- The limiter runs **inside** `submitContactForm()` (not a separate opt-in wrapper), so all callers get it automatically.

**Decisions made (with rationale)**

- *Key = email (not IP/global/per-process).* Chosen by answer Q1-A. No network identity exists in this headless feature; email is the only per-sender signal. Normalizing (`trim().toLowerCase()`) prevents trivial bypass via casing/whitespace and matches how email is already trimmed in `validateContact()` (`scripts/contact.ts:22`).
- *Persistence = JSON file on disk* (answer Q2-B). In-memory counters reset every CLI invocation and would only constrain repeated in-process calls, defeating the purpose. A file is the lowest-cost durable store given zero runtime dependencies.
- *File location = repo-root `.contact-rate-limit.json`, gitignored, env-overridable* (answer Q5-A). Keeps state local and discoverable; `CONTACT_RATE_LIMIT_FILE` lets tests point at an isolated file.
- *Thresholds env-overridable with safe fallback* (answer Q6-A). Follows the existing `process.env` config convention (`SLACK_URL` at `scripts/contact.ts:68`). Invalid or non-positive values fall back to defaults so a bad env var can never disable or corrupt the limiter.
- *Breach throws a typed error* (answer Q4-A). Matches the established fail-fast-before-network pattern of `validateContact()` and the `instanceof`-based error branching callers already use (`scripts/contact.ts:105`, `scripts/test-contact.ts:39`).
- *Only HTTP-200 sends consume quota.* A rate limit should meter *successful* deliveries; counting failed attempts would let transient Slack/network failures lock out a legitimate sender.
- *Tests isolate their counter file* (answer Q7-A). The live test sets `CONTACT_RATE_LIMIT_FILE` to a fresh temp file per run so its repeated `test@example.com` sends never trip the limit. The `npm run contact` smoke script is left as-is and the caveat is documented.

**Out of scope**

- Global (all-sender) caps, IP-based or session-based limiting.
- Any external store (DB, Redis, cache) or new runtime npm dependency.
- Delay / queue / retry ("wait until the window allows") behavior.
- Cross-process file locking — concurrent CLI runs racing on the file is an accepted, documented limitation.
- Any web UI or HTTP server (none exists).

## Detailed Requirements

### Functional

1. `submitContactForm(input)` records and enforces a per-email submission rate.
2. Before the Slack POST, if the normalized sender email already has `>= CONTACT_RATE_LIMIT_MAX` recorded successful submissions within the trailing `CONTACT_RATE_LIMIT_WINDOW_MS`, throw `RateLimitError` and do **not** POST.
3. After a POST that returns HTTP 200, record a timestamp for the normalized email in the persisted store.
4. A POST that returns non-200, or that throws, records nothing (no quota consumed).
5. `RateLimitError` is exported and carries structured fields: `email`, `limit`, `windowMs`, `retryAfterMs`.
6. `main()` in `scripts/contact.ts` handles `RateLimitError` with a friendly message and exit code 1, alongside the existing `ContactValidationError` branch.

### Technical

1. New rate-limit logic lives in `scripts/contact.ts` (keeps the feature in one module and exportable for tests). It must be ESM and pass `tsc --noEmit` under `strict` + `verbatimModuleSyntax` (`tsconfig.json`).
2. Persistence uses Node built-ins only: `node:fs`, `node:path`, `node:os`. No new entries in `package.json` dependencies.
3. Store format: a JSON object mapping normalized email → array of epoch-millisecond timestamps, e.g. `{ "a@b.com": [1699999999000, 1700000000000] }`.
4. Reads tolerate a missing or corrupt/unparseable file by treating state as empty.
5. Writes are **atomic**: write to a temp file in the same directory, then `fs.renameSync` over the target, so a crash mid-write cannot leave a half-written JSON file.
6. Env parsing: `CONTACT_RATE_LIMIT_MAX` and `CONTACT_RATE_LIMIT_WINDOW_MS` are parsed as integers; `NaN`, `<= 0`, or missing → the default (`5` / `60000`).
7. Config is read at call time (not cached at module load), so tests can set env vars before each call.

### Non-Functional

1. Zero runtime dependencies preserved.
2. No secret or webhook URL is ever logged (unchanged from today).
3. The limiter adds a bounded amount of synchronous file I/O per submission; acceptable for a CLI/headless feature.
4. Timestamps older than the window are pruned on read so the file does not grow unbounded for a given email; emails with no in-window timestamps are dropped entirely on write.

## Proposed Solution

Add a small, self-contained rate-limiter section to `scripts/contact.ts` and wire it into `submitContactForm()` so the check happens after validation and before the POST, with recording after a confirmed 200.

```
submitContactForm(input)
  ├─ resolve + sanitize SLACK_URL         (unchanged, scripts/contact.ts:68-77)
  ├─ validateContact(input)               (unchanged, scripts/contact.ts:79)
  ├─ email = input.email.trim().toLowerCase()
  ├─ checkRateLimit(email)  ──▶ reads JSON file, prunes, counts in-window
  │        │                     if count >= MAX → throw RateLimitError  ✗ (no POST)
  │        ▼ ok
  ├─ res = await fetch(url, …)            (unchanged, scripts/contact.ts:81)
  └─ if res.status === 200:
         recordSubmission(email)  ──▶ append now, prune, atomic write JSON file
     return { status, body }
```

The limiter is a few module-level helpers plus the `RateLimitError` class, all in `scripts/contact.ts`. No new files are strictly required, but the plan keeps the limiter cohesive within that module to match the existing single-file design.

<details><summary><b>Implementation Detail</b></summary>

### Implementation Steps

#### Phase 1 — Add `RateLimitError` and config helpers to `scripts/contact.ts`

1. Add `RateLimitError` immediately after `ContactValidationError` (after `scripts/contact.ts:15`), following that class exactly:

   ```ts
   export class RateLimitError extends Error {
     email: string;
     limit: number;
     windowMs: number;
     retryAfterMs: number;
     constructor(email: string, limit: number, windowMs: number, retryAfterMs: number) {
       super(
         `Rate limit exceeded for ${email}: max ${limit} submissions per ${windowMs}ms. ` +
           `Retry in ~${Math.ceil(retryAfterMs / 1000)}s.`,
       );
       this.name = "RateLimitError";
       this.email = email;
       this.limit = limit;
       this.windowMs = windowMs;
       this.retryAfterMs = retryAfterMs;
     }
   }
   ```

2. Add import of Node built-ins at the top of the file (ESM, matching `verbatimModuleSyntax`):

   ```ts
   import { readFileSync, writeFileSync, renameSync } from "node:fs";
   import { join } from "node:path";
   ```
   (No `os` import is needed since the default file lives under `process.cwd()`, not the temp dir — answer Q5-A.)

3. Add config resolver helpers (read at call time):

   ```ts
   const DEFAULT_MAX = 5;
   const DEFAULT_WINDOW_MS = 60_000;

   function positiveIntEnv(name: string, fallback: number): number {
     const raw = process.env[name]?.trim();
     if (!raw) return fallback;
     const n = Number.parseInt(raw, 10);
     return Number.isFinite(n) && n > 0 ? n : fallback;
   }

   function rateLimitMax(): number {
     return positiveIntEnv("CONTACT_RATE_LIMIT_MAX", DEFAULT_MAX);
   }
   function rateLimitWindowMs(): number {
     return positiveIntEnv("CONTACT_RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS);
   }
   function rateLimitFile(): string {
     const override = process.env.CONTACT_RATE_LIMIT_FILE?.trim();
     return override && override.length > 0
       ? override
       : join(process.cwd(), ".contact-rate-limit.json");
   }
   ```

#### Phase 2 — Add the file-backed store helpers to `scripts/contact.ts`

1. Store shape: `type RateStore = Record<string, number[]>` (normalized email → epoch-ms timestamps).

2. Read helper — tolerant of missing/corrupt files:

   ```ts
   function readStore(file: string): Record<string, number[]> {
     try {
       const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
       if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
         const out: Record<string, number[]> = {};
         for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
           if (Array.isArray(v)) out[k] = v.filter((t): t is number => typeof t === "number");
         }
         return out;
       }
     } catch {
       // missing file or invalid JSON → empty state
     }
     return {};
   }
   ```

3. Atomic write helper — prunes empty entries, writes temp + rename:

   ```ts
   function writeStore(file: string, store: Record<string, number[]>): void {
     for (const [k, v] of Object.entries(store)) {
       if (v.length === 0) delete store[k];
     }
     const tmp = `${file}.${process.pid}.tmp`;
     writeFileSync(tmp, JSON.stringify(store), "utf8");
     renameSync(tmp, file);
   }
   ```
   Using `process.pid` in the temp name avoids collisions between concurrent processes writing the same directory. (Cross-process races on the final file remain an accepted limitation — see Edge Cases.)

4. Check helper — prunes, counts, throws on breach (no write):

   ```ts
   function checkRateLimit(email: string, now: number): void {
     const max = rateLimitMax();
     const windowMs = rateLimitWindowMs();
     const file = rateLimitFile();
     const store = readStore(file);
     const cutoff = now - windowMs;
     const recent = (store[email] ?? []).filter((t) => t > cutoff);
     if (recent.length >= max) {
       const oldest = Math.min(...recent);
       const retryAfterMs = Math.max(0, oldest + windowMs - now);
       throw new RateLimitError(email, max, windowMs, retryAfterMs);
     }
   }
   ```

5. Record helper — appends `now`, prunes, atomic write (called only after HTTP 200):

   ```ts
   function recordSubmission(email: string, now: number): void {
     const windowMs = rateLimitWindowMs();
     const file = rateLimitFile();
     const store = readStore(file);
     const cutoff = now - windowMs;
     const recent = (store[email] ?? []).filter((t) => t > cutoff);
     recent.push(now);
     store[email] = recent;
     writeStore(file, store);
   }
   ```
   Note: `now` is captured once in `submitContactForm()` and threaded into both helpers so the check and the record use a consistent clock. `Date.now()` is the only clock source.

#### Phase 3 — Wire into `submitContactForm()` (`scripts/contact.ts:65-87`)

1. After `validateContact(input)` at `scripts/contact.ts:79` and before the `fetch` at `scripts/contact.ts:81`, insert:

   ```ts
   const now = Date.now();
   const email = input.email.trim().toLowerCase();
   checkRateLimit(email, now); // throws RateLimitError; no send on breach
   ```

2. After the `fetch` resolves, record only on success. Change the tail of the function from:

   ```ts
   const res = await fetch(url, { ... });
   return { status: res.status, body: await res.text() };
   ```
   to:
   ```ts
   const res = await fetch(url, { ... });
   const body = await res.text();
   if (res.status === 200) {
     recordSubmission(email, now);
   }
   return { status: res.status, body };
   ```
   (Reading `body` once before the branch preserves the existing return shape and avoids consuming the response body twice.)

#### Phase 4 — Handle `RateLimitError` in `main()` (`scripts/contact.ts:96-112`)

Add a branch to the existing `catch` so the smoke script reports the limit cleanly, mirroring the `ContactValidationError` branch at `scripts/contact.ts:105-107`:

```ts
} catch (err) {
  if (err instanceof ContactValidationError) {
    console.error("Validation failed:");
    for (const i of err.issues) console.error(`  - ${i}`);
  } else if (err instanceof RateLimitError) {
    console.error(`Rate limited: ${err.message}`);
  } else {
    console.error(`Contact error: ${(err as Error).message}`);
  }
  process.exit(1);
}
```

#### Phase 5 — `.gitignore`

Add the default counter file so local state is never committed. Append to `/workspace/.gitignore` (grouped with the other repo-local scratch entries):

```
# Contact rate-limit counter state
.contact-rate-limit.json
```

#### Phase 6 — Tests (`scripts/test-contact.ts`)

1. **Isolate the live test's counter file.** At the start of `run()` (before Test 1's send at `scripts/test-contact.ts:22`), point the limiter at a fresh temp file so repeated `test@example.com` sends across runs never trip the limit:

   ```ts
   import { tmpdir } from "node:os";
   import { join } from "node:path";
   // …
   process.env.CONTACT_RATE_LIMIT_FILE = join(
     tmpdir(),
     `contact-rate-limit-test-${process.pid}-${Date.now()}.json`,
   );
   ```
   This must be set **before** the first `submitContactForm` call. Import `RateLimitError` alongside the existing imports (`scripts/test-contact.ts:1-6`).

2. **New Test 3 — limit enforced, no POST on breach.** Stub the global `fetch` to count calls and return a fake 200 (`{ status: 200, text: async () => "ok" }`), set `CONTACT_RATE_LIMIT_FILE` to its own fresh temp file and `CONTACT_RATE_LIMIT_MAX=3` (small, fast), then call `submitContactForm` with a *distinct* email `limit-test@example.com` `limit + 1` times. Assert: the first `limit` calls succeed, the final call throws `RateLimitError`, and `fetch` was called exactly `limit` times (the breach did not POST). Restore the original `fetch` afterward.

3. **New Test 4 — window expiry.** With `fetch` stubbed and a short `CONTACT_RATE_LIMIT_WINDOW_MS` (e.g. `200`) and `CONTACT_RATE_LIMIT_MAX=1` against a fresh temp file and email `window-test@example.com`: one call succeeds, an immediate second call throws `RateLimitError`, then after `await` of a timer slightly longer than the window a third call succeeds again. (Keep the sleep short to keep the suite fast.)

4. Keep Tests 1 and 2 intact. Preserve the `ALL PASS` / `process.exit(0)` contract at `scripts/test-contact.ts:47-48`.

   Example `fetch` stub pattern for Tests 3 & 4:
   ```ts
   const realFetch = globalThis.fetch;
   let calls = 0;
   globalThis.fetch = (async () => {
     calls++;
     return { status: 200, text: async () => "ok" } as Response;
   }) as typeof fetch;
   try {
     // … exercise submitContactForm …
   } finally {
     globalThis.fetch = realFetch;
   }
   ```

### Edge Cases

- **Missing / corrupt counter file** → treated as empty state (fresh start); the next successful send creates it.
- **Invalid env values** (`CONTACT_RATE_LIMIT_MAX=abc`, `0`, `-5`, empty) → fall back to defaults; the limiter is never silently disabled by a bad value.
- **Concurrent CLI processes** racing on the same file → last writer wins; a few submissions could slip past the cap. Accepted and documented (no file locking in scope). Per-pid temp names prevent corrupt writes, only lost updates.
- **Failed/non-200 POST** → no timestamp recorded; a flaky Slack endpoint cannot exhaust a sender's quota.
- **Different-cased / padded emails** (`Test@Example.com `) → normalized to one bucket via `trim().toLowerCase()`, so casing/whitespace cannot be used to bypass the limit.
- **Validation failure** → still throws `ContactValidationError` before the rate-limit check ever runs (check is inserted after `validateContact`), so invalid input never touches the counter file.
- **Clock skew / timestamps in the future** → `t > cutoff` simply keeps them; harmless for this feature.

### Performance & Scale

Each submission does at most two small synchronous file reads and one atomic write of a tiny JSON object. Pruning on every read/write bounds per-email array size to at most `MAX` in-window entries and drops empty emails, so the file stays small. This is appropriate for a low-volume headless CLI feature.

### Observability

No new logging of secrets. The `RateLimitError` message includes the email, limit, window, and an approximate retry-after, surfaced by `main()` on the CLI. No metrics/telemetry are in scope.

### Rollout / Migration

No migration needed — the counter file is created lazily on first successful send. The default behavior (5/60s) activates immediately on deploy. Operators can tune via `CONTACT_RATE_LIMIT_MAX` / `CONTACT_RATE_LIMIT_WINDOW_MS` or relocate state via `CONTACT_RATE_LIMIT_FILE` without code changes.

### Dependencies & Related Work

- No new npm dependencies. Uses `node:fs`, `node:path` (and `node:os` in the test only).
- Builds on the existing patterns: `ContactValidationError` (`scripts/contact.ts:8-15`), the pre-send guard ordering (`scripts/contact.ts:79` before `:81`), `process.env` config (`scripts/contact.ts:68`), and the `instanceof` error branching in `main()` (`scripts/contact.ts:105`) and the test (`scripts/test-contact.ts:39`).

</details>

## Technical Considerations

- **Dependencies:** none added; Node built-ins only (`node:fs`, `node:path`, `node:os`). Preserves "No runtime npm dependencies" (README.md:15).
- **Configuration (all via `process.env`, read at call time):**
  - `CONTACT_RATE_LIMIT_MAX` — integer, default `5`; invalid/non-positive → `5`.
  - `CONTACT_RATE_LIMIT_WINDOW_MS` — integer ms, default `60000`; invalid/non-positive → `60000`.
  - `CONTACT_RATE_LIMIT_FILE` — path to the counter JSON; default `.contact-rate-limit.json` under `process.cwd()`.
- **Type/build:** new code lives under `scripts/`, is ESM, and must pass `npm run typecheck` (`tsc --noEmit`, `strict`, `verbatimModuleSyntax`). The stubbed `fetch` in tests should be cast to `typeof fetch` to satisfy strict typing.
- **Security:** no secret logging (unchanged). The counter file stores only email addresses and timestamps — treat it as repo-local and keep it gitignored. Email normalization prevents casing/whitespace bypass.
- **Repo drift note:** the planning Repo Snapshot was taken at commit `5297643`; the current checkout is on branch `contact-rate-limit` at `63a0251` (only `plan:` commits on top — the referenced source files are unchanged). Line numbers in this plan reflect the current `scripts/contact.ts`: `submitContactForm` starts at line 65, `validateContact(input)` call at 79, `fetch` at 81, `main()` at 89, direct-execution guard at 116. (The Understanding's reference to line 67 for `submitContactForm` is off by two; use 65.) Note there is **no** `reportErrorToHula` in the current `main()`; the error branch simply logs and exits 1.

## Testing Strategy

**Unit / integration (in `scripts/test-contact.ts`, run via `npm run test:contact`):**

- *Test 1 (existing, live):* real Slack send asserting HTTP 200 — now runs against an isolated temp counter file so it never trips the limit.
- *Test 2 (existing, no network):* `validateContact` rejects bad input — unchanged.
- *Test 3 (new):* with `fetch` stubbed, `CONTACT_RATE_LIMIT_MAX=3`, and a fresh temp file, `limit + 1` calls for one email → first `limit` succeed, final call throws `RateLimitError`, `fetch` called exactly `limit` times (breach did not POST).
- *Test 4 (new):* with `fetch` stubbed, short `CONTACT_RATE_LIMIT_WINDOW_MS` and `MAX=1` → first succeeds, immediate second throws `RateLimitError`, after the window elapses a third succeeds (window pruning works).

**Type-check:** `npm run typecheck` must pass clean (strict).

**Manual:**

- `SLACK_URL` set, run `npm run contact` six times within a minute → the 6th prints `Rate limited: …` and exits 1 (using the default repo-root counter file).
- Confirm `.contact-rate-limit.json` is created in the repo root and ignored by git (`git status` shows it untracked-and-ignored).
- Set `CONTACT_RATE_LIMIT_MAX=1 CONTACT_RATE_LIMIT_WINDOW_MS=5000` and verify the override takes effect; set `CONTACT_RATE_LIMIT_MAX=abc` and verify it falls back to 5.

## Documentation Updates

Update `README.md`:

- Add a **Rate limiting** section (after the API section, ~line 80) describing: per-email limit (normalized `trim().toLowerCase()`), default 5 submissions / 60 s sliding window, persistence to `.contact-rate-limit.json` (overridable via `CONTACT_RATE_LIMIT_FILE`, gitignored), and the env overrides `CONTACT_RATE_LIMIT_MAX` / `CONTACT_RATE_LIMIT_WINDOW_MS` with their fallback-on-invalid behavior.
- Add `class RateLimitError extends Error` (fields `email`, `limit`, `windowMs`, `retryAfterMs`) to the API list (near README.md:71).
- Update the `submitContactForm(input)` API line (README.md:78-79) to note it enforces the per-email rate limit and records quota only on HTTP 200.
- Add the **smoke-script caveat**: repeated `npm run contact` within a minute (all using `test@example.com`) will eventually be rate-limited; the live test avoids this by isolating its counter file.
- Note the concurrent-process limitation (no file locking).

## Acceptance Criteria

1. `RateLimitError` is exported from `scripts/contact.ts` with fields `email`, `limit`, `windowMs`, `retryAfterMs`, and extends `Error`.
2. `submitContactForm()` throws `RateLimitError` (and makes **no** `fetch` call) when a normalized email has `>= CONTACT_RATE_LIMIT_MAX` successful submissions within `CONTACT_RATE_LIMIT_WINDOW_MS`.
3. A timestamp is recorded **only** when the Slack POST returns HTTP 200; non-200 and thrown POSTs record nothing.
4. Counter state persists across separate processes via `.contact-rate-limit.json` (default, under `process.cwd()`) and honors `CONTACT_RATE_LIMIT_FILE`; a missing or corrupt file is treated as empty; writes are atomic (temp + rename).
5. `CONTACT_RATE_LIMIT_MAX` and `CONTACT_RATE_LIMIT_WINDOW_MS` override the defaults (5 / 60000); invalid or non-positive values fall back to the defaults.
6. Email keys are normalized with `trim().toLowerCase()` so casing/whitespace variants share one counter.
7. `main()` prints a friendly rate-limit message and exits 1 on `RateLimitError`.
8. `.contact-rate-limit.json` is listed in `.gitignore`.
9. `npm run test:contact` prints `ALL PASS` and exits 0 with all four tests (the live send no longer risks tripping the limit); the new tests cover breach-blocks-POST and window-expiry.
10. `npm run typecheck` passes with no errors.
11. `README.md` documents the limit, env vars, counter file, `RateLimitError`, and the smoke-script caveat.
12. No new runtime npm dependencies are added to `package.json`.
