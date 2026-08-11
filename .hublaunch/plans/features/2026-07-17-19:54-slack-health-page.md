# Add a "Health" Page That Reports Slack Webhook Health

## Problem Statement

The repository can post to Slack via the `SLACK_URL` Incoming Webhook (see [scripts/contact.ts](scripts/contact.ts)), but there is no way to check whether that Slack integration is actually healthy — whether `SLACK_URL` is configured and whether the webhook endpoint is alive and reachable — without sending a real (channel-visible) message. This adds a **Health** page: a small, headless TypeScript module that runs a set of health checks against the Slack webhook and renders the result as a human-readable status "page" (console text by default, and optionally a self-contained static HTML file), exiting non-zero when Slack is unhealthy.

### Planning Context

> This section captures the key decisions from planning so the implementing agent has full context. There is **no chat history** available to the implementer — everything needed is in this document.

**Key Requirements Discussed (from the request):**

- Create a "simple page called **health**" that "shows the health of **slack**".
- The request explicitly said **"take the best options"**, so all ambiguous choices below were decided by the planner and are documented with rationale. The implementer should **not** ask questions — build exactly what is written here.
- The plan is filed under the `features` plans subfolder.

**Decisions Made (planner-chosen, since "best options" were requested):**

- **"Page" = a headless status report, not a web server.** This repository has **no web UI and no HTTP server** — its README states this explicitly, and the prior "Contact Us page" shipped as a headless module ([scripts/contact.ts](scripts/contact.ts)), not a served page. To stay consistent, the Health "page" is a module + CLI that **renders** a health report. Two render targets are provided so "page" is satisfied both pragmatically and literally:
  - **Default:** a formatted **console text** report (this is the "page" you see when you run it).
  - **Optional (`--html`):** a **self-contained static HTML file** (`health.html`) you can open in a browser — a real page, still with **no server** (no Express/Next/http.createServer). Rationale: honors "page" literally at near-zero cost (a pure string builder) without violating the repo's no-server convention.
- **Language / runtime:** TypeScript run via `tsx` (already a devDependency), matching every existing script and the `npm run` convention in [package.json](package.json). Uses native global `fetch` (Node 18+). **No new runtime dependencies.**
- **What "health of Slack" means here — two checks:**
  1. **Config check (no network):** `SLACK_URL` is set (non-empty after trim) **and** matches the Slack Incoming Webhook shape `^https://hooks\.slack\.com/services/`.
  2. **Reachability check (network, non-intrusive):** probe the webhook **without posting a visible message to the channel**. Implementation: `POST` an empty body to `SLACK_URL` and classify the response:
     - Slack replies **HTTP 400** with body `invalid_payload` for a **live** webhook (the endpoint exists but rejected the empty payload) → **healthy / reachable**.
     - Slack replies **HTTP 404** with body `no_service` / `no_team` for a **dead/revoked** webhook → **unhealthy**.
     - Any network error / timeout / other unexpected status → **unhealthy**.
     This is the "best option" because it verifies the endpoint is alive **without spamming the Slack channel**, so the Health page can be checked/refreshed repeatedly. The behavior relies on Slack's observable webhook responses; the classification is centralized in one function and documented so it is easy to adjust.
- **Optional live ping (`--live` flag, opt-in only):** when passed, additionally performs a **real** send (`POST {"text": "..."}`) and asserts HTTP 200 + body `ok`, adding a third "live send" check. Off by default so the routine, repeatable health check never posts to the channel.
- **Timeout:** the reachability/live network calls use `AbortSignal.timeout(timeoutMs)` (default **5000 ms**) so a hung endpoint reports unhealthy instead of hanging.
- **Overall status:** `healthy` only if **all** performed checks pass; otherwise `unhealthy`. Process exit code is `0` when healthy, `1` when unhealthy (so it is usable as a CI/monitoring gate).
- **Secret hygiene:** the `SLACK_URL` value is **never logged or rendered** (same convention as [scripts/contact.ts](scripts/contact.ts)). The HTML/text output shows only a redacted host (e.g. `hooks.slack.com/services/…`), never the token path.
- **Reusable API:** the checking logic is exported as functions so [scripts/test-health.ts](scripts/test-health.ts) can import and exercise it directly (mirrors how `test-contact.ts` imports from `contact.ts`).

**Out of Scope:**

- Any real web server, routing, or long-running process (no HTTP listener). The `--html` output is a static file, not a served endpoint.
- Health of anything other than the Slack `SLACK_URL` webhook (no GitHub/Vercel/DB health).
- Historical health tracking, dashboards, uptime storage, or scheduling/cron.
- Client-side JS, CSS frameworks, or a build/bundler step for the HTML page (it is a single self-contained string with minimal inline CSS).
- Authentication, rate-limit handling, or retries/backoff on the probe (a single attempt within the timeout is sufficient for a health check).
- Configurable Slack target beyond the single `SLACK_URL` webhook.
- Mocking Slack in the automated test — the test exercises the real webhook (matches the existing `test-contact.ts` approach).

#### Background & Context

- **Why needed:** there is currently no way to confirm the Slack integration is configured and reachable except by sending a live message via `npm run contact` / `npm run test:contact`, which posts a visible message every time. A dedicated, non-intrusive Health check answers "is Slack wired up and alive?" cheaply and repeatably.
- **Current state:** `SLACK_URL` is defined in [.env](.env) and forwarded to containers via `envVars: ["SLACK_URL"]` in [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js). Only [scripts/contact.ts](scripts/contact.ts) consumes it. No health check exists.
- **Who is affected:** developers and operators running the repo locally or inside a HubLaunch container who need to verify Slack connectivity.

**Current Behavior:** No health check exists. Verifying Slack requires an actual channel-visible send.

**Desired Behavior:** Running `npm run health` prints a Slack health report and exits `0` (healthy) or `1` (unhealthy), without posting a visible Slack message by default. `npm run health -- --html` also writes a `health.html` page. `npm run health -- --live` additionally performs a real send ping.

## Detailed Requirements

### Functional Requirements

1. **Health module — `scripts/health.ts`**
   - Exports (all typed, with JSDoc):
     - `type HealthState = "healthy" | "unhealthy"`
     - `interface HealthCheck { name: string; state: HealthState; detail: string; latencyMs?: number }`
     - `interface SlackHealthReport { overall: HealthState; checks: HealthCheck[]; checkedAt: string; redactedTarget: string | null }`
     - `interface HealthOptions { timeoutMs?: number; live?: boolean }`
     - `function checkSlackConfig(): HealthCheck` — pure/no-network. Reads `process.env.SLACK_URL`. Returns `healthy` when set and matches `^https:\/\/hooks\.slack\.com\/services\//`; otherwise `unhealthy` with a specific `detail` ("SLACK_URL is not set" or "SLACK_URL is not a Slack Incoming Webhook URL").
     - `async function checkSlackReachability(url: string, timeoutMs: number): Promise<HealthCheck>` — non-intrusive probe (see below). Records `latencyMs`.
     - `async function checkSlackLiveSend(url: string, timeoutMs: number): Promise<HealthCheck>` — real `POST {"text": "✅ Slack health check <ISO timestamp>"}`, healthy iff HTTP 200 + body `ok`. Only called when `live` is true.
     - `async function checkSlackHealth(opts?: HealthOptions): Promise<SlackHealthReport>` — orchestrates: run config check; if config unhealthy, **skip** network checks (mark them skipped-as-unhealthy with detail "skipped: SLACK_URL invalid") and return; else run reachability (and live if requested). `overall` = `healthy` iff every performed check is `healthy`.
     - `function redactSlackUrl(url: string): string` — returns e.g. `hooks.slack.com/services/…` (host + `/services/…`), **never** the token segments. Used for display only.
     - `function renderHealthText(report: SlackHealthReport): string` — multi-line, aligned report suitable for a terminal (see format below).
     - `function renderHealthPageHtml(report: SlackHealthReport): string` — a full, self-contained HTML document string (inline `<style>`, no external assets) presenting the same report.
   - `main()` direct-run behavior (guarded by `import.meta.url === \`file://${process.argv[1]}\``, same guard as `contact.ts`):
     - Parse flags from `process.argv.slice(2)`: `--html` (also accept `--html=<path>`; default path `health.html`), `--live`, `--timeout=<ms>`.
     - Call `checkSlackHealth({ live, timeoutMs })`.
     - Print `renderHealthText(report)` to stdout.
     - If `--html`, write `renderHealthPageHtml(report)` to the target path via `node:fs/promises` `writeFile`, then print `Wrote <path>` (relative path only).
     - `process.exit(report.overall === "healthy" ? 0 : 1)`.

2. **Reachability probe behavior (`checkSlackReachability`)**
   - `POST` to `url` with `AbortSignal.timeout(timeoutMs)`, `Content-Type: application/json`, **empty body** (`body: ""`).
   - Read `status` and trimmed response `text`.
   - Classification:
     - `status === 400` **or** body `=== "invalid_payload"` → `state: "healthy"`, `detail: "webhook endpoint is live (rejected empty payload as expected)"`.
     - `status === 404` **or** body `=== "no_service"` / `"no_team"` → `state: "unhealthy"`, `detail: "webhook not found (revoked or invalid)"`.
     - `status === 200` (some webhooks accept empty) → treat as `healthy`, `detail: "webhook reachable (HTTP 200)"`.
     - anything else → `state: "unhealthy"`, `detail: \`unexpected response: HTTP ${status}\`` (do **not** include response body verbatim beyond a short, non-secret snippet).
   - On thrown error (network/timeout — `AbortError` when timed out): `state: "unhealthy"`, `detail: "unreachable: <error name/message>"`. Never include `url`.
   - Always set `latencyMs` = elapsed ms around the fetch (use `performance.now()`).

3. **CLI script registration — `package.json`**
   - Add scripts:
     - `"health": "tsx scripts/health.ts"`
     - `"test:health": "tsx scripts/test-health.ts"`

4. **Live end-to-end test — `scripts/test-health.ts`**
   - Mirrors [scripts/test-contact.ts](scripts/test-contact.ts) structure (`run()` + `process.exit`).
   - **Test 1 (config, no network):** temporarily unset `SLACK_URL`, assert `checkSlackConfig().state === "unhealthy"`; restore it. Assert that with a bad value (`"not-a-url"`) it is also `unhealthy`, and with the real value it is `healthy`.
   - **Test 2 (live reachability):** requires `SLACK_URL`. Call `checkSlackHealth()` (default, non-intrusive) and assert `report.overall === "healthy"` and the reachability check is `healthy`. If `SLACK_URL` is unset, print `FAIL: SLACK_URL not set — cannot run live test` and exit `1` (same as `test-contact.ts`).
   - Print `ALL PASS` and `process.exit(0)` only if all pass; otherwise print the failing check and exit `1`.

### Technical Requirements

- **Technology/Framework:** TypeScript, ES modules, run via `tsx`. Native global `fetch`, `AbortSignal.timeout`, `performance.now`, `node:fs/promises`. Target/`module` per existing [tsconfig.json](tsconfig.json) (ES2022 / ESNext, strict).
- **Location:** new files `scripts/health.ts` and `scripts/test-health.ts`; edits to [package.json](package.json) and [README.md](README.md). `scripts/**/*.ts` is already covered by `tsconfig.json` `include`.
- **Dependencies:** none added. Reuses existing `tsx`, `typescript`, `@types/node` devDependencies.
- **Constraints:** must pass `npm run typecheck` (`tsc --noEmit`, strict). No `any` without justification. Never log or render the `SLACK_URL` value or its token path.

### Non-Functional Requirements

- **Performance:** a health run completes within the timeout (default 5 s) even when Slack is down.
- **Security:** the webhook URL is a secret. It is read from `process.env` only, never printed, never written to `health.html`, never included in error messages. Only a redacted host is displayed.
- **Backwards Compatibility:** purely additive. No existing file behavior changes except appending two `package.json` scripts and a README section. `scripts/contact.ts` is untouched.
- **Error Handling:** all network failures are caught and converted into an `unhealthy` check with a safe, secret-free `detail`. The process still exits cleanly with code `1`.

## Proposed Solution

**High-level approach:** Add a self-contained, headless health-check module `scripts/health.ts` that mirrors the structure and conventions of the existing `scripts/contact.ts` (typed interfaces, small pure functions, a network function using native `fetch`, and a guarded `main()`), plus a live test `scripts/test-health.ts` mirroring `scripts/test-contact.ts`. Register both via `npm run` scripts. The "page" is rendered as terminal text by default and, with `--html`, as a static self-contained HTML file — no server is introduced.

### Key Components

1. **`scripts/health.ts` (new)**
   - What: the health checks, the report type, and the two renderers plus a CLI `main()`.
   - Why this approach: keeps parity with the repo's single-file, dependency-free module style; the exported functions make the logic unit-testable from `test-health.ts`.
   - Integration: consumes `process.env.SLACK_URL` exactly like `contact.ts`; added to `package.json` scripts alongside `contact` / `test:contact`.

2. **`scripts/test-health.ts` (new)**
   - What: live + no-network assertions over the exported functions.
   - Why: matches the existing testing convention (real webhook, plus a no-network validation test).
   - Integration: imports from `./health.ts` (note the `.ts` extension — required by `allowImportingTsExtensions`, same as `test-contact.ts` importing `./contact.ts`).

3. **`package.json` + `README.md`**
   - What: two new npm scripts; a new "Health" documentation section.

### Files Likely to Change

- `scripts/health.ts` — **new.** Slack health-check module (checks, report type, text + HTML renderers, CLI `main`).
- `scripts/test-health.ts` — **new.** Live + no-network test for the health module.
- [package.json](package.json) — add `"health"` and `"test:health"` scripts.
- [README.md](README.md) — add a "Health check" section documenting `npm run health`, the flags, and the exit codes. (README currently documents only Contact Us; either extend it with a Health section or note both features.)

### Code Patterns to Follow

**Pattern References:**

- **Module shape, typed error-free small functions, guarded `main()`:** follow [scripts/contact.ts](scripts/contact.ts).
  - Reuse the direct-run guard verbatim: `if (import.meta.url === \`file://${process.argv[1]}\`) { await main(); }`.
  - Reuse the "read secret from `process.env`, throw/mark unhealthy if unset, never log it" approach from `submitContactForm()`.
  - Reuse the escaping mindset for any user/text placed into Slack payloads (the live ping text is a fixed internal string, so escaping is trivial, but keep the pattern in mind).
- **Slack POST via native `fetch`:** follow `submitContactForm()` in [scripts/contact.ts](scripts/contact.ts) — `fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body })` and reading `res.status` / `await res.text()`.
- **Test structure:** follow [scripts/test-contact.ts](scripts/test-contact.ts) — top-level `run()`, guard on `process.env.SLACK_URL`, `console.log("PASS …")` / `console.error("FAIL …")`, `process.exit(0|1)`, final `ALL PASS`.
- **TS import extension:** import sibling module with explicit `.ts` (e.g. `import { checkSlackHealth } from "./health.ts"`) — required by `tsconfig.json`'s `allowImportingTsExtensions`, exactly as `test-contact.ts` does.

**Anti-Patterns to Avoid:**

- Do **not** add a web server / HTTP listener, Express, Next.js, or a framework — the repo is intentionally serverless/headless.
- Do **not** add runtime npm dependencies (no `node-fetch`, `axios`, `dotenv`, `chalk`). Use native `fetch` and plain strings.
- Do **not** post a visible Slack message on the default health run — only `--live` may send.
- Do **not** log, print, or embed the `SLACK_URL` value or its token path anywhere (stdout, HTML, error `detail`).

## Implementation Steps

#### Phase 1: Core module

- [ ] Create `scripts/health.ts` with the types: `HealthState`, `HealthCheck`, `SlackHealthReport`, `HealthOptions`.
- [ ] Implement `redactSlackUrl(url)` (host + `/services/…`, token hidden).
- [ ] Implement `checkSlackConfig()` (no network; env presence + webhook-shape regex).
- [ ] Implement `checkSlackReachability(url, timeoutMs)` (non-intrusive empty-body POST + response classification + `latencyMs` + timeout via `AbortSignal.timeout`).
- [ ] Implement `checkSlackLiveSend(url, timeoutMs)` (real `POST {"text": …}`, healthy iff 200 + `ok`).
- [ ] Implement `checkSlackHealth(opts)` orchestrator (config gate → reachability → optional live; compute `overall` and `checkedAt = new Date().toISOString()`).

#### Phase 2: Renderers + CLI

- [ ] Implement `renderHealthText(report)` — aligned terminal report (format below).
- [ ] Implement `renderHealthPageHtml(report)` — self-contained HTML document (inline CSS, no external assets), same data.
- [ ] Implement `main()` — flag parsing (`--html[=path]`, `--live`, `--timeout=<ms>`), print text, optional HTML write via `node:fs/promises`, `process.exit(0|1)`.
- [ ] Add the `import.meta.url` direct-run guard.

#### Phase 3: Scripts + test

- [ ] Add `"health"` and `"test:health"` scripts to [package.json](package.json).
- [ ] Create `scripts/test-health.ts` (Test 1 config/no-network; Test 2 live reachability), importing from `./health.ts`.

#### Phase 4: Docs + verification

- [ ] Add a "Health check" section to [README.md](README.md) (usage, flags, exit codes, non-intrusive note).
- [ ] Run `npm run typecheck` — must pass clean.
- [ ] Run `npm run health` (with `SLACK_URL` set via `set -a; source .env; set +a`) — verify a healthy report + exit `0`.
- [ ] Run `npm run health -- --html` — verify `health.html` is written and opens in a browser.
- [ ] Run `npm run test:health` — verify `ALL PASS`.

### Text report format (`renderHealthText`)

```
Slack Health — <overall UPPERCASED>
Target:  hooks.slack.com/services/…      (redacted; never the token)
Checked: 2026-07-17T19:54:00.000Z

  [OK]   config        SLACK_URL is set and is a Slack webhook URL
  [OK]   reachability  webhook endpoint is live (rejected empty payload as expected)   (123ms)
```

- Use `[OK]` for healthy and `[FAIL]` for unhealthy (ASCII only, no color dependency).
- One line per check: state tag, check `name`, `detail`, and `latencyMs` in parentheses when present.

### HTML page format (`renderHealthPageHtml`)

- A complete `<!doctype html>` document with `<title>Slack Health</title>`, minimal inline `<style>` (system font, a colored status badge: green for healthy, red for unhealthy), a heading, the redacted target, the `checkedAt` timestamp, and a list/table of checks with state, name, detail, latency.
- No external stylesheets, scripts, fonts, or images. Fully self-contained so it opens offline.

## Edge Cases & Considerations

#### Edge Cases to Handle

1. **`SLACK_URL` unset/empty:** `checkSlackConfig()` → `unhealthy` ("SLACK_URL is not set"); network checks skipped; overall `unhealthy`; exit `1`. No throw.
2. **`SLACK_URL` set but not a Slack webhook (e.g. `https://example.com/x`):** config → `unhealthy` ("not a Slack Incoming Webhook URL"); network checks skipped.
3. **Webhook revoked/invalid (404 `no_service`):** reachability → `unhealthy` ("webhook not found (revoked or invalid)").
4. **Slack/network down or slow:** fetch throws or times out at `timeoutMs` → reachability `unhealthy` ("unreachable: …"); still exits cleanly with `1`.
5. **Unexpected 2xx/5xx on probe:** classify per rules; unexpected statuses → `unhealthy` with a short, secret-free `detail`.
6. **`--live` used with a healthy webhook:** posts one real message (`✅ Slack health check <timestamp>`) and asserts 200 + `ok`; adds a `live` check. Documented as channel-visible.
7. **`--html` write fails (permissions):** catch, print a safe error to stderr, still exit based on health state.

#### Potential Challenges

- ⚠️ **Undocumented Slack probe responses:** the `invalid_payload` / `no_service` classification is based on Slack's observable webhook behavior, not a formal SLA. Mitigation: centralize classification in `checkSlackReachability`, treat HTTP 400 (regardless of body) as "endpoint alive", and document the assumption inline so it is easy to adjust if Slack changes responses.
- ⚠️ **Secret leakage:** easy to accidentally include the URL in an error. Mitigation: never pass `url` into any `detail` string; only `redactSlackUrl(url)` may appear, and only host + `/services/…`.

#### Security Considerations

- `SLACK_URL` read from `process.env` only (never parsed from `.env` by the script; `.env` stays gitignored).
- The value is never logged, printed, embedded in HTML, or placed in error messages. Only a redacted host is shown.
- No user input is accepted by the health check (fixed internal ping text for `--live`), so no injection surface into Slack.

## Technical Considerations

#### Dependencies

- None added. Uses existing devDependencies `tsx`, `typescript`, `@types/node` and Node built-ins (`fetch`, `AbortSignal`, `performance`, `node:fs/promises`).

#### Configuration Changes

- `package.json` scripts only:
  ```json
  "health": "tsx scripts/health.ts",
  "test:health": "tsx scripts/test-health.ts"
  ```
- No changes to `.hublaunch/hublaunch.config.js` — `SLACK_URL` is already in `envVars`.

#### Environment Variables

- `SLACK_URL` — Slack Incoming Webhook URL (existing secret). Required for the reachability and live checks; the config check reports its absence rather than crashing.

#### Error Handling Strategy

- Network/timeout errors are caught inside each network check and mapped to an `unhealthy` `HealthCheck` with a safe `detail` (never the URL). The orchestrator never throws for an unhealthy state — it returns a report; `main()` translates the report into the exit code.

## Testing Requirements

#### Unit / Logic Tests (`scripts/test-health.ts`, run via `npm run test:health`)

- [ ] `checkSlackConfig()` returns `unhealthy` when `SLACK_URL` is unset (temporarily delete `process.env.SLACK_URL`, then restore).
- [ ] `checkSlackConfig()` returns `unhealthy` for a non-Slack URL (`"not-a-url"`, `"https://example.com/x"`).
- [ ] `checkSlackConfig()` returns `healthy` for the real `SLACK_URL`.
- [ ] `checkSlackHealth()` (default, non-intrusive) returns `overall: "healthy"` against the real webhook, and does **not** post a visible message.

#### Integration / Live Test

- [ ] With a valid `SLACK_URL`, `checkSlackReachability()` reports `healthy` with a numeric `latencyMs`.
- [ ] If `SLACK_URL` is unset, the test prints `FAIL: SLACK_URL not set — cannot run live test` and exits `1` (parity with `test-contact.ts`).

#### Manual Testing Checklist

1. **Setup:** `set -a; source .env; set +a` (loads `SLACK_URL`); `npm install` if needed.
2. **Healthy path:** `npm run health` → prints report with both checks `[OK]`, exits `0` (`echo $?` → `0`). No Slack message appears in the channel.
3. **HTML page:** `npm run health -- --html` → writes `health.html`; open it in a browser and confirm a green "healthy" badge and the redacted target (no token visible in page source).
4. **Unhealthy config:** run with `SLACK_URL` unset (`env -u SLACK_URL npm run health`) → config `[FAIL]`, network checks skipped, exits `1`.
5. **Unhealthy endpoint:** set `SLACK_URL=https://hooks.slack.com/services/T000/B000/deadbeef` → reachability `[FAIL]` (`no_service`), exits `1`.
6. **Live ping (opt-in):** `npm run health -- --live` → a `✅ Slack health check <timestamp>` message appears in the channel; live check `[OK]`.
7. **Test suite:** `npm run test:health` → prints `ALL PASS`, exits `0`.
8. **Typecheck:** `npm run typecheck` → no errors.

#### Test Data Requirements

- A valid `SLACK_URL` in the environment for live/reachability checks.
- A deliberately-invalid webhook URL (fake token) for the unhealthy-endpoint manual test.

## Documentation Updates

#### User-Facing Documentation

- [ ] Add a "Health check" section to [README.md](README.md):
  - `npm run health` — non-intrusive Slack health report; exit `0` healthy / `1` unhealthy; posts nothing to the channel.
  - `npm run health -- --html` — also writes a self-contained `health.html` page.
  - `npm run health -- --live` — additionally sends a real ping (channel-visible), asserts 200 + `ok`.
  - `npm run test:health` — live + no-network test.
  - Note the non-intrusive probe behavior and that `SLACK_URL` is never printed.

#### Code Documentation

- [ ] JSDoc on every exported type and function in `scripts/health.ts` (mirror the JSDoc density in `contact.ts`).
- [ ] Inline comment on `checkSlackReachability` documenting the Slack response classification (`invalid_payload` = live, `no_service` = dead) and that it is based on observable behavior.

#### Examples to Include

```bash
# Non-intrusive Slack health report (default)
npm run health

# Also write a static HTML page you can open in a browser
npm run health -- --html            # writes health.html
npm run health -- --html=status.html

# Opt-in: send a real ping message to the channel
npm run health -- --live

# Live + no-network test
npm run test:health
```

## Acceptance Criteria

- [ ] **AC1:** `npm run health` (with a valid `SLACK_URL`) prints a report showing `config` and `reachability` checks and exits `0`, **without** posting any visible message to the Slack channel.
- [ ] **AC2:** With `SLACK_URL` unset, `npm run health` reports the `config` check as failed, skips network checks, and exits `1` (no crash, no stack trace, no URL leak).
- [ ] **AC3:** With a revoked/invalid webhook URL, `npm run health` reports the `reachability` check as failed (`no_service`) and exits `1`.
- [ ] **AC4:** `npm run health -- --html` writes a self-contained `health.html` that opens in a browser and shows the same report; the file contains **no** `SLACK_URL` token (only the redacted host).
- [ ] **AC5:** `npm run health -- --live` sends a real ping and the `live` check passes (200 + `ok`); this mode is documented as channel-visible and is off by default.
- [ ] **AC6:** `npm run test:health` prints `ALL PASS` and exits `0` when `SLACK_URL` is valid.
- [ ] **AC7:** `npm run typecheck` passes with no errors (strict mode).
- [ ] **AC8:** The `SLACK_URL` value/token never appears in any stdout output, the HTML file, or any error message.
- [ ] **AC9:** No new runtime npm dependencies are added; `scripts/contact.ts` is unchanged.

#### Definition of Done

- All acceptance criteria met.
- `npm run typecheck`, `npm run health`, and `npm run test:health` all succeed as described.
- README documents the new Health check.
- No secret leakage; no new dependencies; no web server introduced.

## Dependencies & Related Work

#### Dependencies

- [ ] Requires a valid `SLACK_URL` Slack Incoming Webhook (already present in [.env](.env) and forwarded via `envVars` in [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js)).

#### Blockers

- None.

#### Related Issues/PRs

- Builds on the Contact Us feature (PR #110, commit `e4bf664`) which established the `SLACK_URL` webhook contract and the `scripts/contact.ts` module pattern this plan mirrors.
