# Add Landing Page + Contact Us Page with Slack Form Notifications

## Problem Statement

The repository needs two web pages — a **Landing Page** and a **Contact Us** page — plus a backend endpoint that forwards submitted contact forms to Slack. The Landing Page is a placeholder ("Welcome, we are coming soon"). The Contact Us page presents a form with **email**, **subject**, and **body** fields; on submit, the form data is posted to Slack via the `SLACK_URL` Incoming Webhook. A test must exercise the Slack notification feature. Today no web app, server, or `package.json` exists — the repo contains only bash `hula-*.sh` scripts and HubLaunch config.

### Planning Context

> This section captures every decision from planning. The implementing AI agent has **no chat history** — everything needed is in this document.

**Key Requirements:**

- Two pages: **Landing Page** (`/`) and **Contact Us** (`/contact`).
- Landing Page content: a heading/message stating **"Welcome, we are coming soon."** — nothing else.
- Contact Us page: an HTML `<form>` with three inputs — **email**, **subject**, **body**.
- On form submit, send the form contents to Slack using the webhook URL in the `SLACK_URL` environment variable.
- Provide a **test** for the Slack notification sending feature.

**Decisions Made (chosen without asking, per the "do not ask me questions" instruction — reasoning included so they can be reversed if wrong):**

- **Stack: TypeScript on Node v24 native type-stripping, zero runtime dependencies.** This matches the convention set by the prior Slack script plan (`2026-07-04-11:29-slack-welcome-message-script.md`): Node v24.11.1 runs `.ts` directly (`node file.ts`) and ships global `fetch` (Node 18+). No `express`, `axios`, or `node-fetch`.
- **A server is required (not pure static HTML).** A browser cannot POST directly to `https://hooks.slack.com` — CORS blocks it, and shipping the secret webhook to the client is a security leak. Therefore a minimal server-side forwarder is introduced. It uses Node's built-in `node:http` module (no web framework) to stay dependency-free.
- **Single HTTP server serves both pages and the form endpoint.** Routes: `GET /` → landing HTML, `GET /contact` → contact HTML, `POST /api/contact` → validate + forward to Slack. This keeps everything in one runnable process (`node src/server.ts`).
- **Slack message format:** POST JSON `{"text": "..."}` to `SLACK_URL`. The text is a formatted multi-line string containing the email, subject, and body. Slack Incoming Webhooks return HTTP 200 with the literal body `ok` on success.
- **Slack sending is isolated in a reusable, testable function** `sendContactToSlack(payload)` in `src/slack.ts`, so the test can call it directly. It accepts an **injectable fetch** (`deps.fetch`, defaulting to global `fetch`) so the test can stub the network without hitting real Slack.
- **Test uses Node's built-in test runner (`node:test` + `node:assert`) — no Jest/Vitest.** Keeps zero dependencies. The test stubs `fetch` to assert the correct URL, headers, and payload are sent, and verifies error handling — it does **not** require a live Slack webhook to pass.
- **Form is submitted via `fetch` from a small inline `<script>`** (progressive: shows a success/error message without a full page reload). The endpoint also accepts a normal form POST as a fallback.
- **Page titles / styling:** minimal inline or single shared CSS file. Visual polish is out of scope; correctness of the form + Slack flow is the priority.

**Out of Scope:**

- Persisting submissions to a database.
- Authentication, spam protection / CAPTCHA, rate limiting.
- Email validation beyond a basic format check.
- Production deployment/hosting config, TLS, CI wiring.
- Multi-channel or rich Slack Block Kit formatting (plain `text` only).
- Any framework (React/Vue/Express/Next).

#### Background & Context

- **Why needed:** the project wants a public-facing entry point (coming-soon landing) and a way for visitors to contact the team, with submissions delivered to Slack.
- **Current state:** no `package.json`, no `src/`, no HTML. `SLACK_URL` exists in [.env](.env) and is forwarded to containers via `envVars: ["SLACK_URL"]` in [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js#L70). No code consumes it.
- **Who is affected:** developers running the repo locally / in a HubLaunch container, and eventual site visitors.

**Current Behavior:** No web pages exist; `SLACK_URL` is unused by any code.

**Desired Behavior:** Running `node src/server.ts` serves the Landing Page at `/` and the Contact Us form at `/contact`. Submitting the contact form posts email/subject/body to Slack and shows a success message. A test verifies the Slack-sending function builds and sends the correct request.

---

## Detailed Requirements

### Functional Requirements

1. **Landing Page — `GET /`**
   - Returns `200` with `Content-Type: text/html`.
   - Body shows an `<h1>` (or equivalent) with the exact text: **`Welcome, we are coming soon.`**
   - Includes a link to `/contact` (so the contact page is reachable). This link is the only navigation.

2. **Contact Us Page — `GET /contact`**
   - Returns `200` with `Content-Type: text/html`.
   - Renders a `<form>` containing:
     - `email` — `<input type="email" name="email" required>`
     - `subject` — `<input type="text" name="subject" required>`
     - `body` — `<textarea name="body" required></textarea>`
     - a submit button.
   - An inline `<script>` intercepts submit, POSTs JSON to `/api/contact` via `fetch`, and displays a success or error message inline (no navigation away on success).

3. **Form Submission Endpoint — `POST /api/contact`**
   - Accepts `Content-Type: application/json` with body `{ email, subject, body }`. Also accept `application/x-www-form-urlencoded` as a fallback (normal form POST).
   - **Validation:** all three fields must be present and non-empty (after trim); `email` must match a basic email regex. On invalid input, respond `400` with JSON `{ ok: false, error: "<reason>" }` and do **not** call Slack.
   - On valid input, call `sendContactToSlack({ email, subject, body })`.
   - On Slack success, respond `200` with JSON `{ ok: true }`.
   - On Slack failure (non-200, body ≠ `ok`, network error, or missing `SLACK_URL`), respond `502` with JSON `{ ok: false, error: "Failed to send notification" }`. Log details server-side (never log the full `SLACK_URL`).

4. **Slack Sender — `sendContactToSlack(payload, deps?)` in `src/slack.ts`**
   - Reads `process.env.SLACK_URL`. If unset/empty (after trim): throw an `Error` with message `SLACK_URL environment variable is not set`.
   - Builds the message text (see format below).
   - POSTs to `SLACK_URL` with header `Content-Type: application/json` and body `{"text": "<message>"}` using `deps.fetch ?? globalThis.fetch`.
   - Returns `{ status: number, body: string }`.
   - Considers the send successful only when `status === 200` **and** trimmed body `=== "ok"`. On any other outcome, throw an `Error` including the status (but **not** the URL).

   **Message text format** (exact template):
   ```
   New contact form submission
   Email: <email>
   Subject: <subject>
   Body:
   <body>
   ```

### Technical Requirements

- **Language/Runtime:** TypeScript executed by Node v24 native type-stripping (`node src/server.ts`). Global `fetch` (Node 18+). Repo host runs Node **v24.11.1**.
- **HTTP:** Node built-in `node:http` for the server; global `fetch` for the outbound Slack call. **No** web framework.
- **Location:** new top-level `src/` directory. New `package.json` at repo root declaring `"type": "module"` and convenience scripts.
- **Config:** `PORT` env var (default `3000`). `SLACK_URL` env var (already present in `.env`).
- **Constraints:** `.env` is gitignored; the server reads `SLACK_URL` from `process.env` and does **not** parse `.env` itself. The caller exports it (e.g. `set -a; source .env; set +a; node src/server.ts`) or runs inside the HubLaunch container that forwards it.

### Non-Functional Requirements

- **Security:** never log or return the full `SLACK_URL` (secret webhook). On error, log/return status only. Escape/encode user-provided form values when embedding in HTML responses to prevent reflected XSS (the endpoint returns JSON, not echoed HTML, which sidesteps most of this — but the inline success message must set text via `textContent`, never `innerHTML`).
- **Backwards Compatibility:** additive only — new files; no changes to existing bash scripts or config.
- **Error Handling:** validation errors → `400`; Slack/config errors → `502`; unknown routes → `404`; method mismatch → `405`. All error responses are JSON `{ ok: false, error }` for `/api/*`.

---

## Proposed Solution

**High-level approach:** Add a `src/` folder with a dependency-free `node:http` server that serves two HTML pages and one JSON endpoint, plus an isolated, injectable Slack sender module and a `node:test` test for it. Add a minimal root `package.json`.

### Key Components

1. **`src/slack.ts` — Slack sender (core testable unit)**
   - Exports `sendContactToSlack(payload: ContactPayload, deps?: { fetch?: typeof fetch }): Promise<{ status: number; body: string }>`.
   - Exports `buildSlackText(payload: ContactPayload): string` (pure function — trivially testable).
   - Exports type `ContactPayload = { email: string; subject: string; body: string }`.
   - The `deps.fetch` injection is what makes the test hermetic (no live Slack needed).

2. **`src/server.ts` — HTTP server & routing**
   - `node:http` server. Routes `GET /`, `GET /contact`, `POST /api/contact`, else `404`.
   - Parses JSON / urlencoded bodies (small helper — read stream to string, size-capped at e.g. 10 KB).
   - Validates input, calls `sendContactToSlack`, maps outcomes to status codes.
   - Serves HTML from `src/pages.ts` (or inline template strings).

3. **`src/pages.ts` — HTML templates** (optional split; may inline in `server.ts`)
   - `landingPage()` → the coming-soon HTML.
   - `contactPage()` → the form HTML + inline submit `<script>`.

4. **`src/slack.test.ts` — test for Slack sending**
   - Uses `node:test` + `node:assert`.
   - Stubs `fetch` to capture the request and return a fake `Response`.

### Files Likely to Change / Create

- `package.json` (new) — `"type": "module"`, scripts: `start`, `test`.
- `src/slack.ts` (new) — Slack sender + `buildSlackText` + types.
- `src/server.ts` (new) — HTTP server, routing, validation.
- `src/pages.ts` (new) — landing + contact HTML (or inline in `server.ts`).
- `src/slack.test.ts` (new) — Slack-sending test.
- `README.md` (new or updated) — how to run and test.

### Code Patterns to Follow

- **For the Slack POST + success check:** follow the sender contract described in [.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md](.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md) — POST JSON `{"text": ...}`, success = HTTP 200 + body `ok`, fail-fast on missing `SLACK_URL`, never log the URL. Reuse that exact convention.
- **For zero-dependency TS execution:** run `.ts` directly with `node` (native type-stripping on Node v24); `package.json` exists only for `"type": "module"` and npm scripts.

### Anti-Patterns to Avoid

- ❌ Do **not** POST to Slack from browser JavaScript (CORS failure + leaked secret). All Slack calls happen server-side.
- ❌ Do **not** add `express`, `axios`, `node-fetch`, `dotenv`, `jest`, or `vitest` — everything is achievable with Node built-ins.
- ❌ Do **not** interpolate user form values into HTML via string concatenation and return them (XSS). The endpoint returns JSON; the client renders messages with `textContent`.
- ❌ Do **not** log `process.env.SLACK_URL`.

---

## Implementation Steps

### Phase 1: Project Setup
- [ ] Create root `package.json` with `"type": "module"`, `"private": true`, and scripts:
  - `"start": "node src/server.ts"`
  - `"test": "node --test src/"`
- [ ] Create `src/` directory.

### Phase 2: Slack Sender (core)
- [ ] Create `src/slack.ts`:
  - [ ] `export type ContactPayload = { email: string; subject: string; body: string }`.
  - [ ] `export function buildSlackText(p: ContactPayload): string` producing the exact 5-line template above.
  - [ ] `export async function sendContactToSlack(p, deps = {})`:
    - read + trim `process.env.SLACK_URL`; throw if empty.
    - `const doFetch = deps.fetch ?? globalThis.fetch`.
    - POST `{ "text": buildSlackText(p) }` with `Content-Type: application/json`.
    - read response text; return `{ status, body }`; throw on non-200 or body ≠ `ok` (message includes status, not URL).

### Phase 3: HTTP Server & Pages
- [ ] Create `src/pages.ts` (or inline in server): `landingPage()` and `contactPage()`.
  - Landing: `<h1>Welcome, we are coming soon.</h1>` + `<a href="/contact">Contact us</a>`.
  - Contact: `<form>` with email/subject/body + submit; inline `<script>` that `fetch`-POSTs JSON to `/api/contact` and shows result via `textContent`.
- [ ] Create `src/server.ts`:
  - [ ] `http.createServer` with a request handler.
  - [ ] Route `GET /` → 200 landing HTML; `GET /contact` → 200 contact HTML.
  - [ ] Route `POST /api/contact`:
    - read body (cap 10 KB), parse JSON or urlencoded.
    - validate email/subject/body (present, non-empty trimmed; email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
    - on invalid → 400 `{ ok:false, error }`.
    - `await sendContactToSlack(...)`; on success → 200 `{ ok:true }`.
    - catch errors → 502 `{ ok:false, error:"Failed to send notification" }`; `console.error` details.
  - [ ] Unknown route → 404 `{ ok:false, error:"Not found" }`; wrong method on known path → 405.
  - [ ] Listen on `process.env.PORT ?? 3000`; log the URL.

### Phase 4: Test
- [ ] Create `src/slack.test.ts` using `node:test` + `node:assert` (details in Testing Strategy).

### Phase 5: Docs
- [ ] Add/update `README.md`: how to export `SLACK_URL`, run `npm start`, open `/` and `/contact`, and run `npm test`.

---

## Edge Cases & Considerations

### Edge Cases to Handle
1. **`SLACK_URL` unset/empty** → `sendContactToSlack` throws; endpoint returns `502`; server startup still succeeds (only fails on actual submit).
2. **Missing/empty form field** → `400` with which field failed; Slack not called.
3. **Malformed email** → `400`.
4. **Oversized request body** (> 10 KB) → `413` (or `400`) and abort; do not buffer unbounded input.
5. **Malformed JSON body** → `400`.
6. **Slack returns non-200 or body ≠ `ok`** → treated as failure → `502`.
7. **Slack network error / timeout** → caught → `502`.
8. **Unknown route** → `404`. **Wrong method** (e.g. `GET /api/contact`) → `405`.

### Potential Challenges
- ⚠️ **CORS / secret exposure** — resolved by server-side forwarding (never client-side Slack calls).
- ⚠️ **Node version drift** — native `.ts` execution needs Node ≥ 22.6 (stable in v24). If run on older Node, `node src/server.ts` fails; README notes the `tsx` fallback (`npx tsx src/server.ts`) but no dependency is added by default.

### Security Considerations
- Secret webhook never logged/returned. Validate + size-cap all input. Client renders server messages with `textContent` only. Responses from `/api/*` are JSON, avoiding reflected HTML.

---

## Technical Considerations

### Dependencies
- **None at runtime.** Uses `node:http`, global `fetch`, `node:test`, `node:assert`.
- Optional (not installed by default): `tsx` — only if the environment runs Node < 22.6.

### Configuration Changes
- No changes to `.hublaunch/hublaunch.config.js` needed — `SLACK_URL` is already in `envVars`.

### Environment Variables
- `SLACK_URL` — Slack Incoming Webhook URL (already in [.env](.env) and forwarded to containers). Required for real submissions; **not** required for the test.
- `PORT` — optional, default `3000`.

### Error Handling Strategy
- `sendContactToSlack` throws typed `Error`s; the server maps: validation → `400`/`413`, Slack/config → `502`, routing → `404`/`405`. Details go to `console.error`; clients get generic safe messages.

---

## Testing Strategy

### Unit Tests — `src/slack.test.ts` (`node --test`)

The test targets the **Slack notification sending feature** and runs **without a live Slack webhook** by injecting a stub `fetch`.

- [ ] **`buildSlackText` produces the exact template** — given `{email, subject, body}`, assert the returned string equals the 5-line format (email/subject/body in order).
- [ ] **`sendContactToSlack` posts the correct request** — set `process.env.SLACK_URL = "https://hooks.slack.com/services/TEST/TEST/TEST"`; pass `deps.fetch = stub`. Assert the stub was called with:
  - the `SLACK_URL` value as URL,
  - method `POST`,
  - header `Content-Type: application/json`,
  - JSON body whose `text` equals `buildSlackText(payload)`.
- [ ] **Success path** — stub returns `{ status: 200, text: async () => "ok" }`; assert resolves to `{ status: 200, body: "ok" }`.
- [ ] **Failure: non-200** — stub returns `{ status: 500, text: async () => "fail" }`; assert it throws and the message includes `500` and does **not** include the URL.
- [ ] **Failure: body ≠ ok** — stub returns `{ status: 200, text: async () => "not_ok" }`; assert it throws.
- [ ] **Failure: missing `SLACK_URL`** — delete `process.env.SLACK_URL`; assert throws `SLACK_URL environment variable is not set` and the stub `fetch` is **never called**.

Example skeleton:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { sendContactToSlack, buildSlackText } from "./slack.ts";

test("posts correct payload to SLACK_URL", async () => {
  process.env.SLACK_URL = "https://hooks.slack.com/services/T/B/X";
  const calls: any[] = [];
  const fakeFetch = async (url: string, init: any) => {
    calls.push({ url, init });
    return { status: 200, text: async () => "ok" } as any;
  };
  const res = await sendContactToSlack(
    { email: "a@b.com", subject: "Hi", body: "Hello" },
    { fetch: fakeFetch as any }
  );
  assert.equal(res.status, 200);
  assert.equal(calls[0].url, process.env.SLACK_URL);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(JSON.parse(calls[0].init.body).text,
    buildSlackText({ email: "a@b.com", subject: "Hi", body: "Hello" }));
});
```

### Integration Test (optional)
- [ ] Start the server on an ephemeral port with a stubbed Slack (point `SLACK_URL` at a local mock or inject via a test-only hook), POST to `/api/contact`, assert `200 { ok: true }`; POST invalid body, assert `400`.

### Manual Testing Checklist
1. **Setup:** `set -a; source .env; set +a` (exports `SLACK_URL`), then `npm start`.
2. **Landing:** open `http://localhost:3000/` → shows "Welcome, we are coming soon." and a Contact link.
3. **Contact page:** open `http://localhost:3000/contact` → form with email/subject/body renders.
4. **Happy path:** fill valid values, submit → inline "success" message; a message appears in the Slack channel with the email/subject/body.
5. **Validation:** submit with a blank field or bad email → inline error, no Slack message.
6. **Config error:** unset `SLACK_URL`, restart, submit → inline error; server logs a failure; no crash.
7. **Test suite:** `npm test` → all Slack tests pass (no live Slack needed).

### Test Data Requirements
- Fake webhook URL `https://hooks.slack.com/services/T/B/X` for unit tests. Sample payload `{ email:"a@b.com", subject:"Hi", body:"Hello" }`.

---

## Documentation Updates

- [ ] Create/update `README.md`:
  - How to export `SLACK_URL` from `.env`.
  - `npm start` and the two URLs (`/`, `/contact`).
  - `npm test` and that it needs no live Slack.
  - Node ≥ 22.6 requirement + optional `npx tsx` fallback.
- [ ] JSDoc on `sendContactToSlack`, `buildSlackText`, and the route handler.
- [ ] Inline comments for body parsing + validation.

---

## Acceptance Criteria

- [ ] **AC1:** `GET /` returns `200` HTML containing exactly `Welcome, we are coming soon.` and a link to `/contact`.
- [ ] **AC2:** `GET /contact` returns `200` HTML with a form having `email`, `subject`, and `body` inputs and a submit button.
- [ ] **AC3:** `POST /api/contact` with valid `{email, subject, body}` sends a Slack message (text follows the defined template) and returns `200 { ok: true }`.
- [ ] **AC4:** `POST /api/contact` with a missing/empty field or invalid email returns `400 { ok: false, error }` and does **not** call Slack.
- [ ] **AC5:** When `SLACK_URL` is unset or Slack fails, the endpoint returns `502 { ok: false, error }` and the server does not crash; `SLACK_URL` is never logged/returned.
- [ ] **AC6:** `npm test` passes all Slack-sending tests **without** a live Slack webhook (fetch is stubbed).
- [ ] **AC7:** No runtime npm dependencies are added (only Node built-ins); `package.json` declares `"type": "module"`.
- [ ] **AC8:** README documents running and testing.

### Definition of Done
- All acceptance criteria met; all tests passing; no secret logging; additive changes only (no edits to existing bash scripts/config); README updated.

---

## Dependencies & Related Work

- **Related plan:** [.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md](.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md) — establishes the TS/Node/`fetch` Slack-sending convention reused here.
- **Required external setup:** a valid Slack Incoming Webhook in `SLACK_URL` (already present in `.env`) for real submissions; not needed for the test suite.
- **Blockers:** none.
