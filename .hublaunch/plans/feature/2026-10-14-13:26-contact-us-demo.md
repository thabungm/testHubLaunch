# Add a "Contact Us" Demo: Self-Contained Static HTML Form Page + Live Slack Send

## Plan Summary

- **What / why:** Add a runnable, visible demonstration of the existing headless Contact Us → Slack feature. Today the only "demo" is `npm run contact`, which silently POSTs a fixed sample to Slack (`scripts/contact.ts:89-113`). This adds a new `npm run contact:demo` that (a) generates a **self-contained static HTML contact-form page** (opened in a browser, no server) showing the four-field form UI, and (b) by default performs a **real live send** through the existing module and surfaces the actual HTTP `200` / `ok` result.
- **Key decisions:** The demo is a **generator script** that writes a static `.html` file — mirroring the `--html` precedent in [`.hublaunch/plans/features/2026-07-17-19:54-slack-health-page.md`](.hublaunch/plans/features/2026-07-17-19:54-slack-health-page.md) (lines 19-21, 206-209) — **plus** a live Node-side send (matching `npm run contact` / `test-contact.ts`). The browser form itself cannot safely reach Slack (no HTTP server exists, and client-side POSTing would leak the `SLACK_URL` secret), so the page **simulates/explains** submission by previewing the Block Kit payload, while the authoritative live send is done server-side via the existing `submitContactForm()`.
- **Reuse, don't re-implement:** The demo imports `submitContactForm`, `buildSlackPayload`, `validateContact`, `ContactValidationError`, and `ContactInput` from `./contact.ts` — no duplication of validation or payload logic on the Node side (client-side JS re-states validation for UX only, clearly labelled as non-authoritative).
- **Most important file:** `scripts/contact-demo.ts` (new). Touches `package.json` (one new script) and `README.md` (one new section). No new runtime dependencies; no web server.
- **Priority / complexity:** Low-to-medium complexity, purely additive. `scripts/contact.ts` is left unchanged.

## Problem Statement

The repository ships a headless "Contact Us" feature: `scripts/contact.ts` validates a four-field submission (**Name**, **Email**, **Subject**, **Body**), builds a [Slack Block Kit](https://api.slack.com/block-kit) payload, and POSTs it to a Slack Incoming Webhook stored in the `SLACK_URL` environment variable. The README states plainly that **there is no web UI or HTTP server** — "submit" means calling the exported `submitContactForm(input)` function ([README.md:7-8](README.md)).

The request is to **build a "Contact Us" demo** — a runnable/visible demonstration of that functionality. The only demonstration that exists today is `npm run contact`, whose `main()` sends a single fixed sample submission and prints a one-line result (`scripts/contact.ts:89-113`). That is a minimal smoke send, not a "demo" of the form itself.

#### Planning Context

> There is **no chat history** available to the implementer. Everything needed to build this is in this document. The decisions below were settled during planning and should be built exactly as written — do **not** re-open them or ask questions.

**Key requirements:**

- Build a demonstration of the existing Contact Us → Slack feature in `thabungm/testHubLaunch`, filed under the `feature` plans folder.
- "Contact us demo" refers to the **existing** feature in this repo (not a new generic contact feature).

**Decisions made (with rationale):**

1. **Demo form = a self-contained static HTML contact-form page (no server).** The demo renders a real HTML page with the four-field form (Name/Email/Subject/Body) that a reviewer opens in a browser. This mirrors the established precedent in [`.hublaunch/plans/features/2026-07-17-19:54-slack-health-page.md`](.hublaunch/plans/features/2026-07-17-19:54-slack-health-page.md) (lines 19-21 and 206-209), where a "page" request was satisfied by a **self-contained static HTML file** built from a plain string, with **no** Express/Next/`http.createServer`. Rationale: it honours "demo/page" literally at near-zero cost without violating the repo's explicit no-server convention ([README.md:7-8](README.md)).
2. **The demo also performs a real, live Slack send.** By default the demo POSTs a sample submission to the real `SLACK_URL` webhook via the existing `submitContactForm()` and shows the actual HTTP `200` + body `ok` result — matching the behaviour of `npm run contact` (`scripts/contact.ts:97-101`) and `test-contact.ts` (`scripts/test-contact.ts:21-31`). Rationale: this proves the end-to-end path works, which a pure offline dry-run could not.
3. **Reconciling the two:** a browser cannot safely drive the real send. `submitContactForm()` is a Node function; a static HTML page in a browser can only reach Slack by (i) running an HTTP server (violates the no-server convention) or (ii) client-side JS POSTing directly to `SLACK_URL` (exposes the secret in the browser — unacceptable). Therefore the browser form **simulates/explains** submission: its submit handler runs client-side validation (for UX) and renders a **preview** of the Block Kit payload, with a prominent note that real delivery is performed server-side. The **real** send + its HTTP `200`/`ok` result is performed and reported by the Node generator and is also embedded into the generated page. This satisfies both "static HTML form page" and "live send, show the real 200/ok".
4. **Reuse the existing module.** Node-side validation and payload building are **not** re-implemented — the demo imports `validateContact`, `buildSlackPayload`, `submitContactForm`, `ContactValidationError`, and the `ContactInput` type from `./contact.ts`, exactly as `scripts/test-contact.ts:1-6` does.
5. **Entry point convention.** The demo is a new file `scripts/contact-demo.ts` wired as a new `npm run` script via `tsx`, alongside `contact` / `test:contact` (`package.json:5-10`), using the same direct-run guard as `scripts/contact.ts:115-118`.
6. **Secret hygiene.** `SLACK_URL` is read from `process.env` only, never logged, never embedded in the generated HTML, and never placed in an error message — same convention as `scripts/contact.ts:68-77`.

**Out of scope** (consistent with the prior contact and health plans' out-of-scope lists):

- Any real web server, routing, framework, or long-running HTTP listener. The `.html` output is a static file, not a served endpoint.
- Client-side submission to Slack from the browser (would leak the secret).
- Persistence, retries/backoff, spam protection, rate-limiting, auth, CAPTCHA.
- CI wiring, scheduling/cron, analytics.
- New runtime npm dependencies, a bundler, or CSS/JS frameworks (the page is one self-contained string with minimal inline CSS and a tiny inline script).
- Changing `scripts/contact.ts` behaviour (it is imported, not modified).

## Detailed Requirements

### Functional Requirements

1. **New demo module — `scripts/contact-demo.ts`:**
   - Imports from `./contact.ts` (explicit `.ts` extension, required by `tsconfig.json`'s `allowImportingTsExtensions`, as `test-contact.ts` does): `submitContactForm`, `buildSlackPayload`, `validateContact`, `ContactValidationError`, and `type ContactInput`.
   - Defines a `SAMPLE: ContactInput` constant (a realistic example submission, like `scripts/contact.ts:90-95`).
   - Exports `function renderContactDemoHtml(args: { sample: ContactInput; payload: object; send: SendOutcome }): string` — returns a full, self-contained `<!doctype html>` document string (see "HTML page content" below).
   - Defines `type SendOutcome = { attempted: boolean; ok: boolean; status?: number; body?: string; error?: string }` describing the Node-side live send (no `SLACK_URL` value anywhere in it).
   - `main()` behaviour (guarded exactly as `scripts/contact.ts:115-118`: `if (import.meta.url === \`file://${process.argv[1]}\`) { await main(); }`):
     - Parse flags from `process.argv.slice(2)`: `--out=<path>` (default `contact-demo.html`) and `--dry-run` / `--no-send` (skip the real POST; build + render only).
     - Build `payload = buildSlackPayload(SAMPLE)` (always; offline, no network).
     - Unless `--dry-run`/`--no-send`: perform the real live send via `submitContactForm(SAMPLE)` and record the outcome into `SendOutcome`. Catch `ContactValidationError` and generic errors (including a missing `SLACK_URL`, which `submitContactForm` throws for — `scripts/contact.ts:77`) and record a **secret-free** `error` string; do **not** crash before writing the page.
     - Write `renderContactDemoHtml(...)` to the `--out` path via `node:fs/promises` `writeFile`.
     - Print to stdout: the live send result line (e.g. `Contact submitted to Slack (HTTP 200)` on success, mirroring `scripts/contact.ts:99`) and `Wrote <relative path>`.
     - Exit `0` when the send succeeded (HTTP 200 + body `ok`) **or** when `--dry-run` was used and the page was written; exit `1` when a requested live send failed. (The page is still written on failure so the UI demo remains available.)
2. **Generated static HTML page content (`renderContactDemoHtml`):**
   - A complete, self-contained `<!doctype html>` document: `<title>Contact Us — Demo</title>`, minimal inline `<style>` (system font, simple card/form layout; no external stylesheets, scripts, fonts, or images).
   - A real `<form>` with four labelled controls — Name (`text`), Email (`email`), Subject (`text`), Body (`textarea`) — pre-filled with the `SAMPLE` values so the form is immediately demonstrable.
   - A small inline `<script>` that, on submit (`preventDefault`): runs **client-side** validation mirroring the rules in `validateContact` (`scripts/contact.ts:19-33`) — non-empty name/subject/body and the same email regex `^[^@\s]+@[^@\s]+\.[^@\s]+$` (`scripts/contact.ts:17`) — then renders a **preview** of the Block Kit payload for the current field values into a `<pre>` on the page. The script makes **no** network request.
   - A clearly-worded explanatory banner stating: this page demonstrates the form UI only; the browser cannot safely deliver to Slack (no HTTP server, and client-side posting would expose the secret webhook), so real delivery is performed server-side by `submitContactForm()` in `scripts/contact.ts`.
   - A "Server-side result" section showing (embedded at generation time): the exact Block Kit payload JSON produced by `buildSlackPayload(SAMPLE)` and the live `SendOutcome` (e.g. "Delivered to Slack — HTTP 200, body: ok", or "Dry run — not sent", or a secret-free error).
   - **Never** contains the `SLACK_URL` value or token.
3. **CLI script registration — `package.json`:**
   - Add one script to `package.json:5-10`: `"contact:demo": "tsx scripts/contact-demo.ts"`.
4. **Documentation — `README.md`:**
   - Add a "Contact Us demo" subsection under Usage documenting `npm run contact:demo`, the `--out` and `--dry-run` flags, that it opens a static HTML page with no server, and that it performs a real (channel-visible) Slack send by default.

### Technical Requirements

- **Technology / runtime:** TypeScript, ES modules, run via `tsx` (devDependency). Node 20 (per `.hublaunch/lessons/testContactUs_RALPH_LESSONS.md`; native type-stripping unavailable, so `tsx` is required). Uses native global `fetch` (via the imported `submitContactForm`) and `node:fs/promises`.
- **Location:** new file `scripts/contact-demo.ts`; edits to `package.json` and `README.md`. `scripts/**/*.ts` is already covered by `tsconfig.json`'s `include`.
- **Imports:** sibling module imported with an explicit `.ts` extension (required by `tsconfig.json`'s `allowImportingTsExtensions` + `verbatimModuleSyntax`; use `import { type ContactInput }` / `import type` for the type-only import, as `scripts/test-contact.ts:5` does).
- **Dependencies:** none added — reuse existing `tsx`, `typescript`, `@types/node`.
- **Constraints:** must pass `npm run typecheck` (`tsc --noEmit`, strict). No `any` without justification. Never log or embed the `SLACK_URL` value or token.

### Non-Functional Requirements

- **Security:** the webhook URL is a secret; it is read only inside `submitContactForm()` (`scripts/contact.ts:68`), never surfaced by the demo (stdout, HTML, or error strings). Only non-secret status/body text (`200` / `ok`) is shown.
- **Backwards compatibility:** purely additive. Only new file + one `package.json` script + one README section. `scripts/contact.ts` is unchanged.
- **Robustness:** the generator writes the HTML page even when the live send fails or `SLACK_URL` is unset — the UI demo must not depend on network/secret availability.
- **Offline-safe page:** the generated `.html` opens and functions (form + client-side validation + payload preview) with no network access.

## Proposed Solution

Add a single new generator module `scripts/contact-demo.ts` that mirrors the shape of `scripts/contact.ts` (typed, small functions, a guarded `main()`) and reuses its exported logic. Running `npm run contact:demo` does two things: it performs a **real** live Slack send of a sample submission through `submitContactForm()` and reports the HTTP `200`/`ok` result, and it writes a **self-contained static HTML contact-form page** that a reviewer can open in a browser. The page shows the four-field form, validates and previews the payload client-side for UX, and clearly explains that real delivery happens server-side (because the browser cannot safely reach Slack). No HTTP server is introduced.

```
 npm run contact:demo
        │
        ▼
 scripts/contact-demo.ts  ──imports──►  scripts/contact.ts
   main():                                 validateContact()
     payload = buildSlackPayload(SAMPLE)   buildSlackPayload()
     send    = submitContactForm(SAMPLE) ──POST──► Slack (SLACK_URL)  → 200 / ok
     writeFile(contact-demo.html)                       │
        │                                               ▼
        ▼                                     (real send result)
  contact-demo.html  ── open in browser ──►  form UI + client-side
   (static, no server)                        validation + payload preview
                                              + embedded server-side result
```

## Testing Strategy

See the collapsible **Implementation Detail** section below for the full testing checklist. In brief:

- **Typecheck:** `npm run typecheck` must pass clean (strict).
- **Manual, offline:** `npm run contact:demo -- --dry-run` writes `contact-demo.html`; open it, confirm the form renders pre-filled, client-side validation flags bad input, the payload preview updates, and the page source contains **no** `SLACK_URL` token.
- **Manual, live:** with `SLACK_URL` exported (`set -a; source .env; set +a`), `npm run contact:demo` prints `Contact submitted to Slack (HTTP 200)` and `Wrote contact-demo.html`, and a message appears in the Slack channel.
- **Regression:** existing `npm run contact` and `npm run test:contact` still pass unchanged.

## Documentation Updates

- `README.md`: add a "Contact Us demo" subsection under Usage (after the existing CLI smoke-test / live-test sections) describing `npm run contact:demo`, the `--out=<path>` and `--dry-run` flags, the static-HTML-no-server nature of the page, and that the default run performs a channel-visible Slack send. Reiterate that `SLACK_URL` is never printed or embedded.
- JSDoc on the exported `renderContactDemoHtml` and `SendOutcome` in `scripts/contact-demo.ts`, matching the comment density of `scripts/contact.ts`.

## Acceptance Criteria

- [ ] **AC1:** `npm run contact:demo` exists (registered in `package.json`) and runs via `tsx` without adding any runtime dependency.
- [ ] **AC2:** Running it writes a self-contained `contact-demo.html` that opens in a browser with **no server**, showing a four-field Contact Us form (Name/Email/Subject/Body) pre-filled with the sample values.
- [ ] **AC3:** The page's submit handler runs client-side validation (matching `validateContact`'s rules, including the email regex) and renders a Block Kit payload preview, making **no** network request.
- [ ] **AC4:** By default the command performs a **real** live send via `submitContactForm()` and prints the actual result (`Contact submitted to Slack (HTTP 200)` on success); the server-side payload and send result are embedded in the generated page.
- [ ] **AC5:** `--dry-run` (or `--no-send`) skips the real POST, still writes the page, and exits `0`.
- [ ] **AC6:** The `SLACK_URL` value/token never appears in stdout, in `contact-demo.html`, or in any error message. If `SLACK_URL` is unset, the command still writes the page and reports a secret-free "not sent" result rather than crashing.
- [ ] **AC7:** `npm run typecheck` passes clean (strict); `scripts/contact.ts` is unchanged and `npm run contact` / `npm run test:contact` still work.

<details><summary><b>Implementation Detail</b></summary>

## Implementation Steps

#### Phase 1: Demo module (`scripts/contact-demo.ts`)

- [ ] Create `scripts/contact-demo.ts`. Import from `./contact.ts`: `submitContactForm`, `buildSlackPayload`, `validateContact`, `ContactValidationError`, and `import { type ContactInput }` (explicit `.ts`, type-only per `verbatimModuleSyntax` — pattern: `scripts/test-contact.ts:1-6`).
- [ ] Define `const SAMPLE: ContactInput = { name, email, subject, body }` with realistic demo values (model on `scripts/contact.ts:90-95`; a timestamped subject helps locate the message in Slack, like `scripts/test-contact.ts:18`).
- [ ] Define `type SendOutcome = { attempted: boolean; ok: boolean; status?: number; body?: string; error?: string }`.
- [ ] Implement `renderContactDemoHtml({ sample, payload, send }): string` (Phase 2).
- [ ] Implement `main()`:
  - Parse `--out=<path>` (default `contact-demo.html`) and `--dry-run` / `--no-send` from `process.argv.slice(2)`.
  - `const payload = buildSlackPayload(sample)` (offline).
  - If not dry-run: `try { const { status, body } = await submitContactForm(sample); send = { attempted:true, ok: status===200 && body==="ok", status, body }; } catch (err) { send = { attempted:true, ok:false, error: safeMessage(err) }; }` where `safeMessage` returns `err.issues.join("; ")` for `ContactValidationError` (mirroring `scripts/contact.ts:105-108`) or `(err as Error).message` otherwise — and must be a message that never contains the URL (note `submitContactForm` throws only the literal string `"SLACK_URL environment variable is not set"` — `scripts/contact.ts:77` — which is safe).
  - Else: `send = { attempted:false, ok:false }`.
  - `await writeFile(outPath, renderContactDemoHtml({ sample, payload, send }))` via `node:fs/promises`.
  - Print the send result (success line mirrors `scripts/contact.ts:99`) and `Wrote ${outPath}`.
  - `process.exit(send.attempted && !send.ok ? 1 : 0)`.
- [ ] Add the direct-run guard verbatim from `scripts/contact.ts:115-118`.

#### Phase 2: HTML renderer

- [ ] Build a single template-literal `<!doctype html>` string with inline `<style>` (system font stack, centered card, labelled inputs, a `<pre>` for the payload preview). No external assets.
- [ ] Emit the `<form>` with four controls pre-filled from `sample` (HTML-escape the sample values when interpolating into attribute/text positions — reuse the same escaping idea as `esc()` in `scripts/contact.ts:35-38`, extended to `"` for attributes).
- [ ] Inline `<script>` (vanilla, no deps): on submit `preventDefault()`, read the four fields, validate using the same rules as `validateContact` (`scripts/contact.ts:19-33`) and the email regex literal from `scripts/contact.ts:17`, show inline error messages for invalid input, and when valid render a JSON preview of the Block Kit structure into the `<pre>`. Add a visible note that this preview mirrors the authoritative builder in `scripts/contact.ts` and is **not** sent from the browser.
- [ ] Add the explanatory banner (browser cannot reach Slack safely → server-side delivery) and the "Server-side result" section embedding `JSON.stringify(payload, null, 2)` and a human-readable line derived from `send` (e.g. `Delivered to Slack — HTTP 200, body: ok` / `Dry run — not sent` / `Not sent — <safe error>`).
- [ ] Assert (by construction and in review) that the template interpolates **only** `sample`, `payload`, and `send` — never `process.env.SLACK_URL`.

#### Phase 3: Wiring + docs

- [ ] Add `"contact:demo": "tsx scripts/contact-demo.ts"` to `package.json` scripts (`package.json:5-10`).
- [ ] Add the "Contact Us demo" subsection to `README.md` (under Usage, near lines 36-60).

#### Phase 4: Verification

- [ ] `npm run typecheck` → clean.
- [ ] `npm run contact:demo -- --dry-run` → writes `contact-demo.html`, exits `0`, prints no secret.
- [ ] Open `contact-demo.html` in a browser; confirm form, client-side validation, payload preview, and absence of any token in page source.
- [ ] `set -a; source .env; set +a; npm run contact:demo` → prints `Contact submitted to Slack (HTTP 200)` + `Wrote contact-demo.html`; message visible in Slack.
- [ ] `npm run contact` and `npm run test:contact` → still pass (regression).

## Edge Cases & Considerations

1. **`SLACK_URL` unset:** `submitContactForm` throws `"SLACK_URL environment variable is not set"` (`scripts/contact.ts:77`). `main()` catches it, records a safe "not sent" outcome, still writes the page, and exits `1` (or `0` under `--dry-run`). No stack trace, no crash.
2. **Live send returns non-200 / non-`ok`:** recorded as `ok:false` with the status/body text shown; page still written; exit `1`.
3. **Output path not writable:** `writeFile` rejects; catch, print a safe stderr message (no URL), exit `1`.
4. **Validation of the sample:** `SAMPLE` is a fixed valid submission, so `submitContactForm` will not throw `ContactValidationError`; the handler still covers it for safety (mirrors `scripts/contact.ts:104-108`).
5. **Repeated runs post repeated Slack messages:** by design (live send is the chosen default). `--dry-run` is provided to avoid channel noise during repeated UI iteration.

#### Potential Challenges

- ⚠️ **Validation logic duplicated in client JS.** The browser cannot import the Node module, so the page's client-side validation necessarily restates `validateContact`'s rules. Mitigation: keep the client rules minimal and copied verbatim from `scripts/contact.ts:17-33`, label the payload preview as "mirror of the server builder; not authoritative", and keep the Node side (the real send + embedded payload) as the source of truth. This duplication is UX-only and does not affect what is actually delivered to Slack.
- ⚠️ **Secret leakage via the template.** Easy to accidentally interpolate env state. Mitigation: the renderer takes only `sample`, `payload`, and `send` as inputs and never reads `process.env`; reviewers verify no `SLACK_URL` substring in the generated file.

#### Security Considerations

- `SLACK_URL` is read only inside the imported `submitContactForm()` (`scripts/contact.ts:68`), never by the demo directly, never printed, never embedded in HTML, never in error strings.
- User-supplied field values in the browser are HTML-escaped before interpolation into the generated page / preview; the client script makes no network calls, so there is no injection path to Slack from the browser.

## Technical Considerations

#### Dependencies

- None added. Uses existing devDependencies (`tsx`, `typescript`, `@types/node`) and Node built-ins (`node:fs/promises`, global `fetch` via the imported module).

#### Configuration Changes

- `package.json`: one new script `"contact:demo": "tsx scripts/contact-demo.ts"`. No change to `.hublaunch/hublaunch.config.js` — `SLACK_URL` is already forwarded via `envVars`.

#### Environment Variables

- `SLACK_URL` — existing Slack Incoming Webhook secret. Required only for the live-send portion; absent in this planning sandbox (per `.hublaunch/lessons/testContactUs_RALPH_LESSONS.md`) and available in the HubLaunch container at run time. The demo degrades gracefully when it is unset.

## Dependencies & Related Work

- Builds directly on the Contact Us → Slack feature in `scripts/contact.ts` (commit `be432f3` / PR #230) and reuses its exported API.
- Follows the static-HTML-"page"-without-a-server precedent established in [`.hublaunch/plans/features/2026-07-17-19:54-slack-health-page.md`](.hublaunch/plans/features/2026-07-17-19:54-slack-health-page.md) (`--html` target, lines 19-21 and 206-209).
- No blockers.

## Assumptions

- The folder flag value `feature` is honoured literally for the plan path (`.hublaunch/plans/feature/`); note the pre-existing precedent folder is `.hublaunch/plans/features/` — the flag, not the precedent, governs the output location per the planning contract.
- Live send is the **default** (per the confirmed answer), with `--dry-run`/`--no-send` added as a convenience to avoid channel noise during repeated UI iteration; the default behaviour is unchanged by that flag's existence.
- The generated page filename defaults to `contact-demo.html` (overridable via `--out`), analogous to the health page's `health.html` default.
- No new automated test file is required for a demo; verification is via `npm run typecheck`, manual browser inspection, and the existing `npm run test:contact`. An optional lightweight smoke assertion (generated HTML contains the form fields and no `SLACK_URL`) may be added but is not mandated.
- Client-side validation in the page is a UX mirror of `validateContact`; the Node module remains the single source of truth for what is actually sent.

</details>
