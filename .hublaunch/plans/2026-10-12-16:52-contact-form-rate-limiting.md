# Add per-email rate limiting to contact form submissions

## Plan Summary

- **What / why:** Guard the public `submitContactForm()` path in `scripts/contact.ts` so a sender cannot flood the Slack webhook. The limit is **per email address**, enforced *after* validation and *before* the Slack `fetch`.
- **Key decisions:** Sliding window of **5 submissions per email per 60s** (both overridable via env). State is **persisted to a JSON file** (`.contact-rate-limit.json` at repo root, overridable via `CONTACT_RATE_LIMIT_FILE`) so the limit survives across short-lived CLI processes. A breach **throws a new `RateLimitError`** immediately — mirroring the existing `ContactValidationError` fail-fast pattern. **Only successful (HTTP 200) sends consume quota.**
- **Most important files:** `scripts/contact.ts` (new `RateLimitError`, new limiter logic inside `submitContactForm()`), a new `scripts/rate-limit.ts` (the file-backed limiter), `scripts/test-contact.ts` (isolation + new tests), `.gitignore`, `README.md`.
- **Constraints:** Zero runtime dependencies (Node `fs`/`path`/`os` built-ins only); new code lives under `scripts/` and must pass strict `tsc --noEmit`.
- **Priority / complexity:** Medium. Low surface area, but the persistence + "count only successful sends" + env-parsing + test-isolation details require care.

## Problem Statement

The headless "Contact Us → Slack" feature exposes a single public entrypoint, `submitContactForm(input)` in `scripts/contact.ts:65`, which validates a submission and POSTs a Slack Block Kit message to the webhook in `SLACK_URL`. There is currently **no throttling**: a caller can invoke `submitContactForm()` (or `npm run contact`) arbitrarily often and every call hits Slack. We want to reject submissions that exceed an allowed frequency before the webhook POST is made.

This is a headless library — README lines 6–8 state "There is no web UI or HTTP server — 'submit' means calling the exported `submitContactForm(input)` function." So there is no IP, session, or request context to key a limiter on; the sender's **email** is the only available identity. Each `npm run contact` / `npm run test:contact` is a fresh, short-lived process (direct-execution guard at `scripts/contact.ts:116`), so an in-memory counter would reset every run — persistence to disk is required for the limit to mean anything across invocations.

#### Planning Context

**Key requirements (confirmed):**

1. **Dimension — per email.** Each distinct sender email gets its own counter, keyed by the email normalized with `trim().toLowerCase()`. (No IP/session exists; email is the only identity.)
2. **Persistence — JSON file on disk.** Counter state survives across separate CLI runs/processes. Default path `.contact-rate-limit.json` resolved relative to `process.cwd()`, overridable via `CONTACT_RATE_LIMIT_FILE`. Node `fs` built-ins only; no DB, no new runtime deps.
3. **Limit — 5 per email per 60s, sliding window.** `CONTACT_RATE_LIMIT_MAX` (default `5`) submissions per `CONTACT_RATE_LIMIT_WINDOW_MS` (default `60000`) per email. Timestamps older than the window are pruned on each check. Invalid or non-positive env values fall back to the defaults.
4. **Breach behavior — throw immediately.** A new `RateLimitError extends Error` is thrown before any Slack POST, mirroring `ContactValidationError`. No delay, no queue, no silent skip.
5. **Only successful sends count.** A timestamp is recorded only when the Slack POST returns HTTP 200. Failed POSTs do not consume quota.
6. **Test isolation.** `scripts/test-contact.ts` points `CONTACT_RATE_LIMIT_FILE` at a fresh temp file per run so the live send never trips the limit. The `npm run contact` smoke script is left as-is and documented.

**Decisions made (with rationale):**

- **Limiter lives inside `submitContactForm()`, not a separate opt-in wrapper** — so every caller (including the smoke script and live test) is automatically guarded, matching how `validateContact()` is already called inside the same function (`scripts/contact.ts:79`).
- **Check runs after validation, before `fetch`** — mirrors the existing pre-send guard ordering (validate at line 79, POST at line 81). We should not consume quota (or even key on) an email that fails validation.
- **New `RateLimitError` subclass carrying structured fields** — the codebase already models typed errors with structured detail (`ContactValidationError` with `issues: string[]`, `scripts/contact.ts:8–15`) and callers branch on `instanceof` (`scripts/contact.ts:105`, `scripts/test-contact.ts:39`). A parallel error type is the idiomatic fit.
- **Env-sourced config with inline fallback** — matches the existing `process.env` + sanitization convention for `SLACK_URL` (`scripts/contact.ts:68–77`); the code never parses `.env` itself.
- **Atomic writes (temp file + `rename`), corrupt/missing file treated as empty** — keeps the single-process common case robust without pulling in a locking dependency.

**Out of scope:**

- Global (all-sender) cap, IP-based limiting, composite keys.
- Any external/persistent datastore (DB, cache, Redis) or new runtime dependency.
- Delay / queue / retry behavior (async wait) on breach.
- Cross-process file locking — concurrent CLI runs racing on the file is an accepted, documented limitation.

**Drift note vs. the source Understanding:** at the current checkout (`4afc7b1`; the Understanding was derived from snapshot `5297643`) `submitContactForm()` begins at **`scripts/contact.ts:65`** (the Understanding said line 67). More importantly, **no `reportErrorToHula` function exists anywhere in the repo** — `main()`'s catch block (`scripts/contact.ts:104–112`) only distinguishes `ContactValidationError` from a generic `Error`. This plan therefore has `main()` handle `RateLimitError` with a friendly message in that same catch block and does **not** reference any `reportErrorToHula` call. All other Understanding details verified against the current code.

## Detailed Requirements

### Functional

- `submitContactForm(input)` throws a `RateLimitError` (before any `fetch`) when the normalized sender email has already had `CONTACT_RATE_LIMIT_MAX` successful submissions within the trailing `CONTACT_RATE_LIMIT_WINDOW_MS` window.
- When not over the limit, behavior is unchanged: POST to Slack and resolve with `{ status, body }`.
- A submission's timestamp is recorded (and persisted) **only** after a POST that returns HTTP 200. Non-200 responses and thrown errors do not consume quota.
- Email keying is case/whitespace-insensitive: `trim().toLowerCase()` on `input.email`.
- `RateLimitError` exposes `email`, `limit`, `windowMs`, and `retryAfterMs` (ms until the oldest in-window timestamp ages out, i.e. when the next send would be allowed).
- `main()` in `scripts/contact.ts` catches `RateLimitError` and prints a friendly message, exiting `1` (no Slack send occurred).

### Technical

- New code under `scripts/`, ESM, passing strict `tsc --noEmit` (`tsconfig.json`: `strict`, `verbatimModuleSyntax`, `allowImportingTsExtensions`). Type-only imports must use `import type`.
- Zero runtime npm dependencies — only Node built-ins (`node:fs`, `node:path`, `node:os` as needed). Import built-ins with the `node:` prefix (consistent with `scripts/build.mjs`).
- Config read from `process.env`:
  - `CONTACT_RATE_LIMIT_MAX` — positive integer, default `5`.
  - `CONTACT_RATE_LIMIT_WINDOW_MS` — positive integer ms, default `60000`.
  - `CONTACT_RATE_LIMIT_FILE` — path, default `.contact-rate-limit.json` resolved against `process.cwd()`.
  - Invalid / non-positive / non-numeric `MAX` and `WINDOW_MS` values silently fall back to defaults.
- File writes are atomic: write to a sibling temp file, then `rename` over the target. A missing or unparseable file is treated as empty state `{}`.

### Non-Functional

- The default counter file must be gitignored so it is never committed.
- The limiter must not break existing usage: the live test is isolated to a temp file; a single `npm run contact` smoke send stays well under 5/min.
- Secrets are never logged (unchanged); `RateLimitError` messages must not include `SLACK_URL`.

## Proposed Solution

Add a small, self-contained **file-backed sliding-window limiter** in a new module `scripts/rate-limit.ts`, and wire it into `submitContactForm()` in `scripts/contact.ts`. The limiter stores, per normalized email, an array of success timestamps; on each check it prunes timestamps outside the window and compares the remaining count against the max.

Flow inside `submitContactForm()` (guard added between the existing validate at line 79 and fetch at line 81):

```
resolve+sanitize SLACK_URL (unchanged)
validateContact(input)                 // existing, line 79
───────────────────────────────────────── new ─────
key      = input.email.trim().toLowerCase()
cfg      = readRateLimitConfig()       // env → {max, windowMs, file}
state    = readState(cfg.file)         // {} if missing/corrupt
recent   = pruneOlderThan(state[key], now - cfg.windowMs)
if (recent.length >= cfg.max)
    throw new RateLimitError(key, cfg.max, cfg.windowMs, retryAfterMs(recent, now, cfg.windowMs))
─────────────────────────────────────────────────
res = await fetch(...)                 // existing, line 81
if (res.status === 200) {              // only successful sends count
    recent.push(now); state[key] = recent
    writeStateAtomic(cfg.file, state)
}
return { status, body }                // existing
```

Component layout (change spans two source modules + tests + docs):

```
scripts/contact.ts ──imports──> scripts/rate-limit.ts
   │  RateLimitError (exported here, alongside ContactValidationError)
   │  submitContactForm(): check before fetch, record after 200
   │  main(): catch RateLimitError
   │
scripts/test-contact.ts ── sets CONTACT_RATE_LIMIT_FILE to temp; new limit tests
.gitignore            ── add .contact-rate-limit.json
README.md             ── new "Rate limiting" section
```

Rationale for a **separate `scripts/rate-limit.ts` module** rather than inlining everything in `contact.ts`: the limiter is cohesive, independently testable (pure functions for prune/window math plus thin fs wrappers), and keeps `contact.ts` focused. `RateLimitError` itself is exported from `contact.ts` so it sits next to `ContactValidationError` in the public API surface callers already import.

## Acceptance Criteria

- [ ] `submitContactForm()` with the same normalized email, called with env `CONTACT_RATE_LIMIT_MAX=5`, succeeds on calls 1–5 and throws `RateLimitError` on call 6 within the window — **with no `fetch` performed on the 6th call**.
- [ ] `RateLimitError` instance has `name === "RateLimitError"`, is an `instanceof Error`, and carries `email`, `limit`, `windowMs`, and a non-negative `retryAfterMs`.
- [ ] A non-200 POST (or a thrown error) does not record a timestamp: e.g. 5 POSTs that return 500 do not block a subsequent send.
- [ ] After the window elapses (verified with a short `CONTACT_RATE_LIMIT_WINDOW_MS`), a previously-blocked email can send again.
- [ ] Two different emails are tracked independently; one hitting its limit does not block the other.
- [ ] Invalid env values (`CONTACT_RATE_LIMIT_MAX=abc`, `=0`, `=-1`; `CONTACT_RATE_LIMIT_WINDOW_MS=0`) fall back to defaults (5 / 60000).
- [ ] Counter state persists across two separate `tsx` process invocations pointed at the same file.
- [ ] A missing counter file and a corrupt/truncated counter file are both treated as empty state (no crash).
- [ ] `npm run typecheck` passes (strict, no emit).
- [ ] `npm run test:contact` passes end-to-end (live send + validation + new rate-limit tests) using an isolated temp counter file.
- [ ] `.contact-rate-limit.json` is listed in `.gitignore`.
- [ ] README documents the env vars, counter file, `RateLimitError`, and the smoke-script caveat.

<details><summary><b>Implementation Detail</b></summary>

## Implementation Steps

### Phase 1 — New limiter module `scripts/rate-limit.ts`

Create `scripts/rate-limit.ts` with the following (zero deps, `node:` built-ins only):

1. **Config reader.**
   ```ts
   export interface RateLimitConfig { max: number; windowMs: number; file: string; }

   function parsePositiveInt(raw: string | undefined, fallback: number): number {
     const n = Number(raw);
     return Number.isInteger(n) && n > 0 ? n : fallback;
   }

   export function readRateLimitConfig(): RateLimitConfig {
     const file = process.env.CONTACT_RATE_LIMIT_FILE?.trim() || ".contact-rate-limit.json";
     return {
       max: parsePositiveInt(process.env.CONTACT_RATE_LIMIT_MAX, 5),
       windowMs: parsePositiveInt(process.env.CONTACT_RATE_LIMIT_WINDOW_MS, 60000),
       // resolve relative paths against cwd; absolute paths pass through
       file: path.resolve(process.cwd(), file),
     };
   }
   ```
   - Note `Number("")` is `0` and `Number(undefined)` is `NaN`; the `Number.isInteger(n) && n > 0` guard rejects both, empty strings, decimals, and non-positive values → defaults. This mirrors the defensive sanitization style used for `SLACK_URL` at `scripts/contact.ts:68–77`.

2. **State I/O.** State shape is `Record<string, number[]>` (normalized email → ascending success-timestamp list in ms).
   ```ts
   type RateState = Record<string, number[]>;

   function readState(file: string): RateState {
     try {
       const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
       return (parsed && typeof parsed === "object") ? parsed as RateState : {};
     } catch {
       return {}; // missing file or corrupt JSON → empty state
     }
   }

   function writeStateAtomic(file: string, state: RateState): void {
     const tmp = `${file}.${process.pid}.tmp`;
     fs.writeFileSync(tmp, JSON.stringify(state));
     fs.renameSync(tmp, file); // atomic replace on same filesystem
   }
   ```
   Import as `import * as fs from "node:fs";` and `import * as path from "node:path";`.

3. **Core check/record API** — keep the pure window math separate from fs so it is unit-testable, and expose one convenience function used by `contact.ts`:
   ```ts
   /** Returns null if under limit; otherwise {limit, windowMs, retryAfterMs}. Does NOT record. */
   export function checkRateLimit(email: string, now: number): null | { limit: number; windowMs: number; retryAfterMs: number };

   /** Records a successful send timestamp for email, pruning stale entries, and persists. */
   export function recordSuccess(email: string, now: number): void;
   ```
   - Both normalize internally: `const key = email.trim().toLowerCase();`
   - `checkRateLimit`: read config + state, `const recent = (state[key] ?? []).filter(t => t > now - windowMs);` if `recent.length >= max`, `retryAfterMs = Math.max(0, recent[0] + windowMs - now)` (oldest in-window timestamp ages out first). Return the breach object; else `null`. (Reads only — no write, so an over-limit check never mutates the file.)
   - `recordSuccess`: read config + state, prune `state[key]` to the window, push `now`, delete the key if the array is empty (keeps the file from growing unbounded with stale keys), write atomically.
   - **Why two calls instead of one "consume" call:** quota is consumed only on HTTP 200, which `rate-limit.ts` can't observe. `contact.ts` calls `checkRateLimit` before `fetch` and `recordSuccess` only after a 200. Accept the tiny TOCTOU window between check and record — acceptable given the "no cross-process locking" decision.
   - Pass `now` in as a parameter (rather than calling `Date.now()` inside) so tests can drive window expiry deterministically if desired; production callers pass `Date.now()`.

### Phase 2 — Wire into `scripts/contact.ts`

1. **Add `RateLimitError`** directly after `ContactValidationError` (after `scripts/contact.ts:15`), following that class's shape:
   ```ts
   export class RateLimitError extends Error {
     email: string;
     limit: number;
     windowMs: number;
     retryAfterMs: number;
     constructor(email: string, limit: number, windowMs: number, retryAfterMs: number) {
       super(
         `Rate limit exceeded for ${email}: max ${limit} submissions per ${windowMs}ms. ` +
         `Try again in ${Math.ceil(retryAfterMs / 1000)}s.`,
       );
       this.name = "RateLimitError";
       this.email = email;
       this.limit = limit;
       this.windowMs = windowMs;
       this.retryAfterMs = retryAfterMs;
     }
   }
   ```

2. **Import the limiter** at the top of `contact.ts`:
   ```ts
   import { checkRateLimit, recordSuccess } from "./rate-limit.ts";
   ```
   (Use the `.ts` extension — `allowImportingTsExtensions` is enabled in `tsconfig.json`, consistent with how `test-contact.ts` imports `./contact.ts`.)

3. **Insert the guard** in `submitContactForm()` between `validateContact(input)` (line 79) and the `fetch` (line 81):
   ```ts
   validateContact(input); // existing

   const now = Date.now();
   const breach = checkRateLimit(input.email, now);
   if (breach) {
     throw new RateLimitError(input.email.trim().toLowerCase(), breach.limit, breach.windowMs, breach.retryAfterMs);
   }

   const res = await fetch(url, { /* existing */ });
   if (res.status === 200) {
     recordSuccess(input.email, now);
   }
   return { status: res.status, body: await res.text() };
   ```
   - `recordSuccess` re-reads state and reuses the same `now`; the body is still read via `await res.text()` as today.

4. **Handle `RateLimitError` in `main()`** — extend the existing catch (`scripts/contact.ts:104–112`) with a branch parallel to the `ContactValidationError` branch:
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

### Phase 3 — Gitignore

Add the default counter file to `.gitignore` (it currently ignores `hublaunch.config.js`, `.hula-worktrees/`, `.env`, `node_modules/`, `.hublaunch/tmp/`):
```
# Contact rate-limit counter state
.contact-rate-limit.json
```

### Phase 4 — Tests (`scripts/test-contact.ts`)

1. **Isolate the live test from the persisted limit.** At the very top of `run()` (before the Test 1 live send at `scripts/test-contact.ts:21`), point the counter file at a fresh temp path so repeated `npm run test:contact` invocations never trip the limit:
   ```ts
   import * as os from "node:os";
   import * as path from "node:path";
   // unique per run without Date.now(): pid + hrtime
   process.env.CONTACT_RATE_LIMIT_FILE = path.join(
     os.tmpdir(), `contact-rate-limit-test-${process.pid}-${process.hrtime.bigint()}.json`,
   );
   ```
   Keep the existing import block (`scripts/test-contact.ts:1–6`) and add `RateLimitError` to it.

2. **New Test 3 — limit trips on call N+1 with no POST.** Stub `globalThis.fetch` to return `{ status: 200, text: async () => "ok" }` and count calls. Use a dedicated email (e.g. `ratelimit-test@example.com`) and a dedicated temp file + `CONTACT_RATE_LIMIT_MAX=5`. Loop 5 successful sends, assert the 6th throws `RateLimitError` and that `fetch` was called exactly 5 times (the blocked call made no POST). Restore the original `fetch` afterward.
   - Because `contact.ts` uses the global `fetch`, assigning `globalThis.fetch = stub` before the calls is sufficient; no module mocking needed.

3. **New Test 4 — window expiry.** Set `CONTACT_RATE_LIMIT_WINDOW_MS` small (e.g. `50`) and `CONTACT_RATE_LIMIT_MAX=1` with the stubbed `fetch`; send once, confirm the 2nd immediate send throws, `await` a delay longer than the window, then confirm a send succeeds again.
   - **Important:** env vars are read inside `readRateLimitConfig()` on every call, so tests can set `process.env.CONTACT_RATE_LIMIT_*` just before the calls they affect; reset/adjust them between tests to avoid cross-test leakage.

4. Keep the existing `ALL PASS` / `process.exit(0)` contract at the end.

### Phase 5 — Documentation (`README.md`)

1. Add `class RateLimitError extends Error` to the **API** list (after the `ContactValidationError` bullet at `README.md:71`), noting its `email`, `limit`, `windowMs`, `retryAfterMs` fields.
2. Update the `submitContactForm(input)` bullet (`README.md:78–79`) to mention it enforces the per-email rate limit before sending and throws `RateLimitError` on breach.
3. Add a new **"Rate limiting"** section documenting:
   - Per-email sliding window, default 5 per 60s.
   - Env vars: `CONTACT_RATE_LIMIT_MAX` (5), `CONTACT_RATE_LIMIT_WINDOW_MS` (60000), `CONTACT_RATE_LIMIT_FILE` (`.contact-rate-limit.json`). Invalid/non-positive MAX/WINDOW values fall back to defaults.
   - Counter file is JSON, gitignored, resolved from `process.cwd()`; only successful (HTTP 200) sends count.
   - **Caveat:** repeated `npm run contact` smoke sends (fixed email `test@example.com`) within a minute will be rate-limited after 5 sends; note the live test isolates itself via `CONTACT_RATE_LIMIT_FILE`.
   - Known limitation: no cross-process file locking; concurrent runs may race on the counter file.

## Edge Cases

- **Email failing validation:** never reaches the limiter (guard is after `validateContact`), so invalid emails never create counter entries or consume quota.
- **Corrupt / partially-written counter file:** `readState` catches `JSON.parse` errors and returns `{}`; atomic temp+rename minimizes the window for a half-written file being read.
- **Stale keys:** `recordSuccess` prunes and deletes emptied keys so the file does not grow unbounded with long-idle emails.
- **Env changed mid-process:** config is read on every `checkRateLimit`/`recordSuccess` call, so late env changes take effect on subsequent calls (useful in tests; harmless in production where env is fixed per process).
- **`retryAfterMs` when exactly at limit:** computed from the oldest in-window timestamp; clamped to `>= 0`.
- **Non-200 and thrown `fetch`:** no `recordSuccess`, so failed sends never consume quota (explicit requirement).

## Technical Considerations

- **Dependencies:** none added. Only `node:fs`, `node:path`, `node:os` (test only). Preserves the "No runtime npm dependencies" guarantee (README:15, `package.json`).
- **Type system:** strict mode + `verbatimModuleSyntax` — use `import type` for type-only imports (e.g. `ContactInput`), and keep the `Record<string, number[]>` state typed. Run `npm run typecheck` as the gate (`scripts/build.mjs` runs `tsc --noEmit`).
- **Security:** `RateLimitError` messages include the (already user-supplied) email but never `SLACK_URL`. The counter file contains only emails + timestamps — it is gitignored so it is never committed.
- **Concurrency:** no file locking (explicitly out of scope). Atomic writes keep each write self-consistent; a lost update under concurrent runs is accepted and documented.
- **Portability:** `os.tmpdir()` + `process.pid`/`process.hrtime.bigint()` give a collision-free temp file without `Date.now()`/`Math.random()`.

## Testing Strategy

- **Unit (pure window math):** optionally exercise `checkRateLimit`/`recordSuccess` against a temp file — count pruning, boundary at exactly `max`, `retryAfterMs` correctness, default fallback for bad env.
- **Integration (via `test-contact.ts`, stubbed `fetch`):** Test 3 (N+1 trips, no POST on blocked call), Test 4 (window expiry). Both use isolated temp counter files and explicit env.
- **Integration (live, real `fetch`):** existing Test 1 must still PASS — guaranteed by the temp-file isolation set at the top of `run()`.
- **Manual:**
  - `npm run typecheck` → clean.
  - `npm run test:contact` → `ALL PASS`.
  - `CONTACT_RATE_LIMIT_FILE=/tmp/x.json CONTACT_RATE_LIMIT_MAX=2` then `npm run contact` three times within a minute → first two succeed, third prints `Rate limited: ...` and exits 1.

## Documentation Updates

- `README.md`: new "Rate limiting" section; API list gains `RateLimitError`; `submitContactForm` bullet mentions the pre-send limit; smoke-script caveat.

## Dependencies & Related Work

- Builds directly on the existing fail-fast guard pattern (`validateContact` at `scripts/contact.ts:79`, before `fetch` at `scripts/contact.ts:81`) and the typed-error convention (`ContactValidationError`, `scripts/contact.ts:8–15`; `instanceof` branching at `scripts/contact.ts:105` and `scripts/test-contact.ts:39`).
- Follows the `process.env` + sanitization config convention established for `SLACK_URL` (`scripts/contact.ts:68–77`).
- No external tickets or prior work; no other modules depend on the new `rate-limit.ts`.

</details>
