# Add per-email rate limiting to contact form submissions

## Plan Summary

- **What / why.** Guard the exported `submitContactForm()` in `scripts/contact.ts` with a per-email sliding-window rate limiter so a single sender cannot flood the Slack webhook. A breach throws a new typed `RateLimitError` before any network call, mirroring the existing fail-fast `ContactValidationError` behavior.
- **Key decisions.** Limit **per normalized email** (`trim().toLowerCase()`) — the only identity available in this headless feature. **5 submissions per 60 s** by default, both overridable via env (`CONTACT_RATE_LIMIT_MAX`, `CONTACT_RATE_LIMIT_WINDOW_MS`). State is **persisted to a JSON file** (default `.contact-rate-limit.json` in the repo root, overridable via `CONTACT_RATE_LIMIT_FILE`) using Node `fs` built-ins only — zero new runtime dependencies. **Only successful sends (HTTP 200) consume quota.**
- **Most important file.** `scripts/contact.ts` — the entire feature lives here; the limiter and `RateLimitError` are added alongside the existing `submitContactForm()` / `ContactValidationError`.
- **Also touched.** `scripts/test-contact.ts` (new rate-limit tests + isolate the live test's counter file), `README.md` (document the new behavior), `.gitignore` (ignore the default counter file).
- **Priority / complexity.** Medium priority, low–moderate complexity. Self-contained, dependency-free, must keep strict `tsc --noEmit` passing.

## Problem Statement

The "Contact Us → Slack" feature exposes a single public entry point, `submitContactForm(input)` in `scripts/contact.ts:65`, which validates the input and then POSTs a Slack Block Kit message to the webhook URL in `SLACK_URL`. There is no web UI, HTTP server, IP, session, or request context (`README.md:6-8`) — "submit" is a direct function call. Today there is nothing stopping a caller from invoking `submitContactForm()` arbitrarily often, so a single sender can flood the Slack channel.

We need to add rate limiting that rejects submissions exceeding an allowed frequency **before** the Slack POST is made, following the codebase's existing fail-fast, zero-dependency, `process.env`-configured conventions.

#### Planning Context

**Key requirements**

- Rate-limit **by sender email**, normalized with `trim().toLowerCase()`. The email is the only identity available (`ContactInput` fields are `name`/`email`/`subject`/`body`, `scripts/contact.ts:1-6`).
- Default limit: **5 submissions per email per 60-second** sliding window.
- Thresholds are **env-overridable**: `CONTACT_RATE_LIMIT_MAX` (default 5) and `CONTACT_RATE_LIMIT_WINDOW_MS` (default 60000). Invalid / non-positive values fall back to the defaults.
- Counter state is **persisted to a JSON file** so the limit survives across separate CLI processes (each `npm run contact` is a fresh process — the direct-execution guard at `scripts/contact.ts:116` runs `main()` per invocation).
- Counter file defaults to **`.contact-rate-limit.json` in the repo root** (resolved relative to `process.cwd()`), is **gitignored**, and is overridable via `CONTACT_RATE_LIMIT_FILE`.
- On breach, throw a new typed **`RateLimitError extends Error`** immediately, before any Slack POST — no delay, no queue, no silent skip.
- **Only successful sends (HTTP 200) consume quota.** A failed POST must not count against the sender.
- Zero new runtime dependencies: Node `fs` / `path` / global `fetch` built-ins only.

**Decisions made (with rationale)**

- **Per-email key (not global / per-process / IP).** This is the only meaningful identity in a headless feature; a global cap would let one sender starve everyone, and per-process-only state resets every CLI run (so it would constrain nothing across invocations). Rationale confirmed by answers Q1=A, Q2=B.
- **File-based persistence (not in-memory, not a DB).** The repo has no datastore and no runtime deps (`README.md:15`, `package.json:11-15`). A JSON file keyed by email is the lightest way to make the limit survive across the short-lived CLI processes. Writes are **atomic** (temp file + `rename`) and a missing/corrupt file is treated as empty state, so a partial write can never wedge the feature. Q2=B, Q5=A.
- **Sliding window (prune-on-read), not a fixed bucket.** Storing per-email arrays of submission timestamps and pruning entries older than the window on each check gives accurate "N per rolling window" semantics with trivial code and no background timer.
- **Throw a typed error (not return a flag, not delay).** Mirrors the existing `ContactValidationError` fail-fast contract (`scripts/contact.ts:8-15,32,79`) so callers branch on `instanceof` exactly as they already do. Q4=A.
- **Check after validation, before the POST.** The limiter slots into the same position as the existing pre-network guard: `validateContact()` runs at `scripts/contact.ts:79`, immediately before the `fetch` at `scripts/contact.ts:81`.
- **Only HTTP-200 sends consume quota.** The point of the limit is to cap *delivered* messages; counting failed POSTs would penalize senders for infrastructure errors they did not cause.
- **Test isolation via `CONTACT_RATE_LIMIT_FILE`.** The live test and the smoke script both use `test@example.com`; without isolation the 6th run within a minute would throw. The test points the env var at a fresh temp file each run; the smoke script is left as-is and the caveat is documented. Q7=A.

**Out of scope**

- Global (non-per-email) caps, IP-based or session-based limiting.
- Any external/persistent datastore (DB, cache, Redis) or new runtime dependency.
- Delay / queue / async-wait behavior on breach.
- Cross-process file locking (concurrent CLI runs racing on the counter file are a documented limitation, not solved here).

## Detailed Requirements

**Functional**

1. `submitContactForm(input)` rejects a submission with `RateLimitError` when the sender's normalized email has already had `max` successful sends within the trailing `windowMs`.
2. The rejection happens **after** `validateContact()` succeeds and **before** any `fetch` to Slack.
3. A successful send (HTTP 200) records a timestamp against the normalized email in the persisted counter file.
4. A non-200 response (or a thrown `fetch` error) does **not** record a timestamp.
5. `RateLimitError` is exported and carries structured fields: `email`, `limit`, `windowMs`, `retryAfterMs`.
6. `main()` in `scripts/contact.ts` handles `RateLimitError` with a friendly message and exit code 1 (same shape as the existing `ContactValidationError` branch at `scripts/contact.ts:105-107`).

**Technical**

1. New code lives under `scripts/` (per `tsconfig.json` `include: ["scripts/**/*.ts"]`) and passes strict `tsc --noEmit` (`scripts/build.mjs`).
2. ESM only (`package.json` `"type": "module"`, `verbatimModuleSyntax: true`). Use `import ... from "node:fs"` / `"node:path"` / `"node:os"` style imports; type-only imports must use `import type`.
3. No new entries in `package.json` dependencies.
4. Env parsing: `CONTACT_RATE_LIMIT_MAX` and `CONTACT_RATE_LIMIT_WINDOW_MS` are parsed with `Number(...)`; any value that is `NaN`, `≤ 0`, or non-finite falls back to its default. Follows the inline `process.env` sanitization style used for `SLACK_URL` at `scripts/contact.ts:68-77`.
5. Counter file path resolves `CONTACT_RATE_LIMIT_FILE` if set, else `path.resolve(process.cwd(), ".contact-rate-limit.json")`.

**Non-Functional**

1. Atomic persistence: write to a sibling temp file then `rename` so readers never observe a half-written file.
2. Resilient reads: a missing, empty, or JSON-corrupt counter file is treated as empty state (no throw).
3. No measurable behavior change for well-behaved callers under the limit; the feature stays synchronous-looking to callers (still returns `Promise<{status, body}>`).

## Proposed Solution

Add a small, self-contained rate-limit layer **inside `scripts/contact.ts`** (keeping the feature a single file, consistent with the current design) with three pieces:

1. **`RateLimitError extends Error`** — declared next to `ContactValidationError` (`scripts/contact.ts:8-15`).
2. **A file-backed store** — read the JSON map `{ [email: string]: number[] }` (email → sorted submission timestamps), prune timestamps older than `now - windowMs`, and write atomically.
3. **The guard + record** wired into `submitContactForm()`: after `validateContact()`, compute the normalized email, load + prune the sender's timestamps, throw `RateLimitError` if the count is already `≥ max`, otherwise proceed to `fetch`; on HTTP 200, append `now` and persist.

```
submitContactForm(input)
  │
  ├─ resolve/clean SLACK_URL            (existing, scripts/contact.ts:68-77)
  ├─ validateContact(input)             (existing, scripts/contact.ts:79)  ── throws ContactValidationError
  ├─ RATE LIMIT CHECK  ◄── NEW
  │     load counter file → prune < now-windowMs
  │     if timestamps[email].length >= max → throw RateLimitError   (no fetch)
  ├─ fetch(url, …POST…)                 (existing, scripts/contact.ts:81)
  └─ if res.status === 200:  ◄── NEW
        append now to timestamps[email] → atomic write counter file
      return { status, body }
```

## Technical Considerations

- **Dependencies / config.** No new npm packages. New env vars: `CONTACT_RATE_LIMIT_MAX`, `CONTACT_RATE_LIMIT_WINDOW_MS`, `CONTACT_RATE_LIMIT_FILE`. All optional with safe defaults, read via `process.env` (matching `SLACK_URL` handling).
- **Security / safety.** The counter file stores plaintext emails and timestamps only — no secrets (never the webhook URL). Default file is gitignored so it is not committed. Atomic writes + tolerant reads prevent a corrupt file from breaking sends.
- **Concurrency.** No cross-process locking. Two CLI processes writing simultaneously could lose one update (last-writer-wins). This is an accepted, documented limitation given the zero-dependency constraint.
- **Drift note.** This plan was produced from the authoritative Understanding. Context `Repo Snapshot` was commit `5297643` on `main`; the plan is being written on branch `contact-rate-limit` at `74371cd`. `scripts/contact.ts`, `scripts/test-contact.ts`, `README.md`, `package.json`, and `.gitignore` are unchanged between those commits (the intervening commits only added planning artifacts), so all `file:line` references below are current. The implementing agent should still spot-check line numbers before editing.

<details><summary><b>Implementation Detail</b></summary>

### Implementation Steps

**Phase 1 — Add `RateLimitError` (in `scripts/contact.ts`)**

Directly after `ContactValidationError` (`scripts/contact.ts:8-15`), add:

```ts
export class RateLimitError extends Error {
  email: string;
  limit: number;
  windowMs: number;
  retryAfterMs: number;
  constructor(email: string, limit: number, windowMs: number, retryAfterMs: number) {
    super(
      `Rate limit exceeded for ${email}: ${limit} submissions per ${windowMs}ms. ` +
        `Retry in ${Math.ceil(retryAfterMs / 1000)}s.`,
    );
    this.name = "RateLimitError";
    this.email = email;
    this.limit = limit;
    this.windowMs = windowMs;
    this.retryAfterMs = retryAfterMs;
  }
}
```

**Phase 2 — Config resolution helpers (in `scripts/contact.ts`)**

Add near the top-level constants (e.g. after `EMAIL_RE` at `scripts/contact.ts:17`). Follow the defensive `process.env` reading already used for `SLACK_URL` (`scripts/contact.ts:68-77`):

```ts
const DEFAULT_RATE_LIMIT_MAX = 5;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

function positiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function rateLimitMax(): number {
  return positiveIntEnv("CONTACT_RATE_LIMIT_MAX", DEFAULT_RATE_LIMIT_MAX);
}
function rateLimitWindowMs(): number {
  return positiveIntEnv("CONTACT_RATE_LIMIT_WINDOW_MS", DEFAULT_RATE_LIMIT_WINDOW_MS);
}
function rateLimitFile(): string {
  const override = process.env.CONTACT_RATE_LIMIT_FILE?.trim();
  return override && override.length > 0
    ? override
    : path.resolve(process.cwd(), ".contact-rate-limit.json");
}
```

Add imports at the top of the file (ESM, `node:` specifiers):

```ts
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";
```

(`CONTACT_RATE_LIMIT_MAX` is read as a number; `Number("5")` → 5. Using floats is harmless since comparisons are `>=`; no need to force integers, but `Number.isFinite` guards against `NaN`/`Infinity`.)

**Phase 3 — File-backed store (in `scripts/contact.ts`)**

Data shape on disk: `Record<string, number[]>` — normalized email → array of epoch-ms timestamps.

```ts
type RateStore = Record<string, number[]>;

function readStore(file: string): RateStore {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as RateStore;
    }
    return {};
  } catch {
    return {}; // missing / empty / corrupt → empty state
  }
}

function writeStore(file: string, store: RateStore): void {
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(store), "utf8");
  renameSync(tmp, file); // atomic replace
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
```

**Phase 4 — Wire the guard + record into `submitContactForm()` (`scripts/contact.ts:65-87`)**

Insert the check immediately after `validateContact(input)` at `scripts/contact.ts:79`, and the record step immediately after the fetch resolves with HTTP 200 (around `scripts/contact.ts:86`):

```ts
validateContact(input); // existing — throws ContactValidationError; no send on failure

// --- NEW: per-email rate limit (pre-network) ---
const max = rateLimitMax();
const windowMs = rateLimitWindowMs();
const file = rateLimitFile();
const email = normalizeEmail(input.email);
const now = Date.now();

const store = readStore(file);
const recent = (store[email] ?? []).filter((t) => now - t < windowMs);
if (recent.length >= max) {
  const oldest = Math.min(...recent);
  const retryAfterMs = windowMs - (now - oldest);
  throw new RateLimitError(email, max, windowMs, retryAfterMs);
}
// --- end NEW ---

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(buildSlackPayload(input)),
});

// --- NEW: only successful sends consume quota ---
if (res.status === 200) {
  recent.push(now);
  store[email] = recent;
  writeStore(file, store);
}
// --- end NEW ---

return { status: res.status, body: await res.text() };
```

Notes:
- Reading `input.email` is safe here because `validateContact()` has already run and guarantees a non-empty, well-formed email.
- `recent` is the pruned list; on a successful send we write back the pruned list plus the new timestamp, which keeps the file from growing unbounded.
- `res.status === 200` matches the existing success contract documented at `README.md:78-79` and asserted at `scripts/test-contact.ts:23`.

**Phase 5 — `main()` error handling (`scripts/contact.ts:104-112`)**

Add a `RateLimitError` branch alongside the existing `ContactValidationError` branch. `main()` currently only logs and exits (there is no error-reporting hook to call):

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

**Phase 6 — `.gitignore`**

Add the default counter file so it is never committed. Append to `/workspace/.gitignore` (after the existing `.env` / `node_modules/` entries, e.g. near `.gitignore:7`):

```
# Contact rate-limit counter state
.contact-rate-limit.json
```

**Phase 7 — Tests (`scripts/test-contact.ts`)**

1. **Isolate the live test's counter.** Before any `submitContactForm` call in `run()` (top of the function, before `scripts/test-contact.ts:14`), point the limiter at a throwaway temp file so repeated `npm run test:contact` runs never trip the limit:

   ```ts
   import { tmpdir } from "node:os";
   import path from "node:path";
   // isolate rate-limit counters for this test run
   process.env.CONTACT_RATE_LIMIT_FILE = path.join(
     tmpdir(),
     `contact-rate-limit-test-${process.pid}.json`,
   );
   ```

   (Set it before the live send at `scripts/test-contact.ts:22`. Using `process.pid` keeps concurrent runs isolated; `Date.now()` is also acceptable.)

2. **New Test 3 — limit is enforced with no network call past the cap.** Import `RateLimitError` and `submitContactForm`. Stub global `fetch` to a fake that returns `{ status: 200, text: async () => "ok" }` and counts calls. Point `CONTACT_RATE_LIMIT_FILE` at a fresh temp file and set `CONTACT_RATE_LIMIT_MAX=3`, `CONTACT_RATE_LIMIT_WINDOW_MS` large (e.g. `60000`). Loop `max + 1` submissions for one email; assert the first `max` resolve with 200, the last throws `RateLimitError`, and `fetch` was called exactly `max` times (no POST on the rejected call). Follow the existing try/catch + `instanceof` assertion style at `scripts/test-contact.ts:34-45`.

3. **New Test 4 — window expiry.** With a short `CONTACT_RATE_LIMIT_WINDOW_MS` (e.g. `50`) and `CONTACT_RATE_LIMIT_MAX=1`, send once (200), `await` a delay longer than the window (e.g. `await new Promise((r) => setTimeout(r, 80))`), then send again and assert it succeeds (the stale timestamp was pruned).

   Because these tests set env vars and stub `fetch`, they must run **after** the live Test 1 (which needs the real `fetch` and `SLACK_URL`) — or restore the original `fetch` afterward. Simplest: run Tests 3 & 4 after Test 2, capture `const realFetch = globalThis.fetch` before stubbing, and restore it if any later code needs it (there is none after, so restoration is optional). Keep each test self-contained with its own temp `CONTACT_RATE_LIMIT_FILE`.

   Example fetch stub:

   ```ts
   let posts = 0;
   const realFetch = globalThis.fetch;
   globalThis.fetch = (async () => {
     posts++;
     return { status: 200, text: async () => "ok" } as Response;
   }) as typeof fetch;
   // ... run submissions, assert, then optionally: globalThis.fetch = realFetch;
   ```

   Keep assertions in the existing `console.log("PASS ...")` / `console.error("FAIL ...")` + `process.exit(1)` idiom (`scripts/test-contact.ts:23-45`).

### Edge Cases

- **Email not yet in store** → `store[email] ?? []` yields empty; first send always allowed.
- **All timestamps stale** → pruned to empty; treated as a fresh sender.
- **Corrupt / partially-written file** → `readStore` catches and returns `{}` (send proceeds, quota effectively reset). Acceptable and self-healing on next successful write.
- **Non-200 response or `fetch` throws** → no timestamp recorded; the error propagates to the caller unchanged (no new catch swallows it).
- **`CONTACT_RATE_LIMIT_MAX=0` or negative / non-numeric** → falls back to default 5 (never a zero/every-request-blocked state).
- **Concurrent processes** → last-writer-wins on the file; a simultaneous send might not be counted. Documented limitation.
- **Different-case / whitespace emails** (`Test@Example.com ` vs `test@example.com`) → normalized to the same key, so they share a counter.

### Performance

- Each submit does one small synchronous file read + (on success) one write. Files hold at most `max` timestamps per distinct email; pruning on every check keeps per-email arrays bounded. Negligible for a CLI/headless feature.

### Observability

- On breach, `main()` logs `Rate limited: <message>` (includes email, limit, window, retry-after) and exits 1. No secret is logged.

### Rollback

- Fully contained in `scripts/contact.ts`, `scripts/test-contact.ts`, `README.md`, `.gitignore`. Reverting those changes and deleting any `.contact-rate-limit.json` restores prior behavior. No migrations, no persisted schema anyone else depends on.

### Dependencies & Related Work

- Depends only on Node built-ins already required by the project (Node ≥ 18 for `fetch`; `node:fs`/`node:path`/`node:os` always present). No `package.json` changes.
- Related existing patterns reused: typed pre-network error (`ContactValidationError`, `scripts/contact.ts:8-15`), pre-send guard placement (`scripts/contact.ts:79`), `process.env` sanitization (`scripts/contact.ts:68-77`), direct-execution guard (`scripts/contact.ts:116`), test assertion style (`scripts/test-contact.ts:34-45`).

</details>

## Testing Strategy

**Unit / integration (`scripts/test-contact.ts`, run via `npm run test:contact`)**

- **Test 1 (existing, live):** real Slack send asserts HTTP 200 — must still pass; protected by pointing `CONTACT_RATE_LIMIT_FILE` at a per-run temp file so repeated runs never hit the cap.
- **Test 2 (existing):** validation rejects bad input with no network — unchanged.
- **Test 3 (new):** with `fetch` stubbed and `CONTACT_RATE_LIMIT_MAX=3`, `max+1` submissions for one email → first `max` return 200, last throws `RateLimitError`, `fetch` called exactly `max` times (no POST past the cap).
- **Test 4 (new):** with a short window and `max=1`, send → wait past window → send again succeeds (stale timestamps pruned).

**Type / build**

- `npm run typecheck` (`tsc --noEmit`, strict) must pass with the new code, including `import type` for type-only imports and `node:` specifiers.
- `npm run build` (`node scripts/build.mjs`) must pass (it is `tsc --noEmit`).

**Manual**

- `npm run contact` once → sends and exits 0. Run it ≥ 6 times within a minute → the 6th prints `Rate limited: …` and exits 1 (expected, documented). Delete `.contact-rate-limit.json` to reset.
- Confirm `.contact-rate-limit.json` is created in the repo root and is ignored by `git status`.

## Documentation Updates

- **`README.md`** — add a "Rate limiting" subsection (e.g. after the API section ending at `README.md:79`, or under Notes at `README.md:81-85`) covering:
  - Per-email limit, default **5 submissions per 60 s**.
  - Env vars `CONTACT_RATE_LIMIT_MAX`, `CONTACT_RATE_LIMIT_WINDOW_MS`, `CONTACT_RATE_LIMIT_FILE` (with defaults and the "invalid falls back to default" rule).
  - The persisted counter file (`.contact-rate-limit.json`, gitignored) and that it only counts successful (HTTP 200) sends.
  - New `RateLimitError extends Error` with fields `email`, `limit`, `windowMs`, `retryAfterMs`, thrown before any network call — add it to the API list alongside `ContactValidationError` at `README.md:71`.
  - The smoke-script caveat: running `npm run contact` more than 5 times within a minute (all using `test@example.com`) will be rate-limited; delete the counter file or set `CONTACT_RATE_LIMIT_FILE` to reset.

## Acceptance Criteria

1. `submitContactForm()` throws `RateLimitError` (a new exported class extending `Error` with `email`, `limit`, `windowMs`, `retryAfterMs`) when a normalized email exceeds `max` sends within `windowMs`, and does **not** call `fetch` on the rejected submission.
2. The rate-limit check runs after `validateContact()` and before the Slack `fetch`.
3. Only HTTP-200 responses record a timestamp; non-200 responses and fetch errors do not consume quota.
4. Defaults are 5 / 60000 ms; `CONTACT_RATE_LIMIT_MAX` and `CONTACT_RATE_LIMIT_WINDOW_MS` override them, and invalid/non-positive values fall back to the defaults.
5. State persists across separate processes via a JSON file defaulting to `.contact-rate-limit.json` in the repo root, overridable via `CONTACT_RATE_LIMIT_FILE`; the default file is gitignored.
6. A missing or corrupt counter file is treated as empty state (no crash), and writes are atomic (temp file + rename).
7. `main()` prints a friendly `Rate limited: …` message and exits 1 on `RateLimitError`.
8. `npm run test:contact` passes all tests — the existing live send (isolated via a temp counter file), the existing validation test, and the two new rate-limit tests.
9. `npm run typecheck` and `npm run build` pass with no errors.
10. `README.md` documents the limit, env vars, counter file, `RateLimitError`, and the smoke-script caveat.
