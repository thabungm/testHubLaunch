# Add "Landing" and "Contact Us" Pages with Slack-Notifying Contact Form

## Problem Statement

The repository needs a minimal web app exposing two pages: a **Landing Page** (a "Welcome — coming soon" placeholder) and a **Contact Us** page with a form (email, subject, body). Submitting the Contact Us form must POST the form data to Slack using the Slack Incoming Webhook URL stored in the `SLACK_URL` environment variable. An automated test must verify the Slack-notification-sending feature.

Today there is no application code, no `package.json`, and no web server in the repo — only HubLaunch tooling (bash `hula-*.sh` scripts, config) and one prior plan that established the `SLACK_URL` webhook contract.

### Planning Context

> This section captures the key decisions from planning so the implementing agent has full context. There is NO chat history available to the implementer — everything needed is in this document.

**Key Requirements Discussed (from the request):**

- Two pages: **Landing Page** and **Contact Us**.
- Landing Page: for now just shows "Welcome, we are coming soon."
- Contact Us page: a form with three fields — **email**, **subject**, **body**.
- Submitting the Contact Us form sends the data out to **Slack**.
- The Slack destination URL is read from the `SLACK_URL` environment variable.
- Write a **test** for the Slack-notification-sending feature.
- The user explicitly requested **no clarifying questions**, so all ambiguous choices below were decided by the planner and are documented with rationale.

**Decisions Made (planner-chosen, since no questions were allowed):**

- **Runtime / framework**: use Node.js's built-in `http` module (zero runtime dependencies). Rationale: the repo has no framework, no `package.json`, and follows a "no heavy deps" convention (see the prior plan `2026-07-04-11:29-slack-welcome-message-script.md`, which deliberately avoided `axios`/`node-fetch`/`dotenv` and used native `fetch`). A single small server file is the lightest way to serve two pages plus a form-handling endpoint. Do **not** introduce Next.js, React, Express, or a build step.
- **TypeScript, run directly**: write `.ts` files run via Node v24 native type-stripping (`node src/server.ts`). Repo Node is **v24.11.1**, which strips types natively — no transpile, no `tsx` required. `package.json` sets `"type": "module"`.
- **Routing**: one HTTP server with routes:
  - `GET /` → Landing Page HTML.
  - `GET /contact` → Contact Us HTML (form).
  - `POST /api/contact` → parse form body, send to Slack, respond.
- **Form submission mechanism**: the Contact form uses `method="POST"` with `Content-Type: application/x-www-form-urlencoded` (native HTML form, no client-side JS framework). The server parses it with the built-in `URLSearchParams`. Rationale: no JS build tooling needed; works with plain HTML.
- **Slack payload**: reuse the established Incoming Webhook contract — POST JSON `{"text": "..."}` to `SLACK_URL`; Slack returns HTTP 200 with body `ok` on success. The message text is composed from the three form fields (see format below). Use native global `fetch` (Node 18+).
- **Slack send is factored into a reusable function** `sendContactToSlack(...)` in its own module so the test can import and exercise it directly (mirrors the prior plan's `sendSlackMessage()` export pattern).
- **Testing strategy**: the test performs a **real live POST to the actual `SLACK_URL`** webhook. It calls `sendContactToSlack(...)` with sample form data and asserts the send succeeded via the HTTP response (status `200` and Slack body `ok`). Rationale (chosen by the user): a true end-to-end verification that the notification actually reaches Slack. Consequence: the test requires a valid `SLACK_URL` in the environment and network access, and it posts a visible message to the real Slack channel on every run. If `SLACK_URL` is unset, the test **fails** (it cannot verify a live send without it). A second test still verifies the fail-fast throw behavior without the network.
- **Fail-fast on missing config**: if `SLACK_URL` is unset/empty, `sendContactToSlack` throws; the `POST /api/contact` handler returns HTTP 500 with a generic error (never leaks the URL).

**Out of Scope:**

- Any real database, persistence, or storing submissions.
- Authentication, CSRF tokens, rate limiting, spam protection (noted as future work).
- Client-side frameworks (React/Vue), CSS frameworks, or a bundler/build step.
- Email validation beyond a basic presence/format check.
- Deploying the app or CI wiring (note: because the test posts live, running it in CI would require a real `SLACK_URL` secret and would post to the channel).
- Configurable Slack channel/target beyond the single `SLACK_URL` webhook.
- Mocking/stubbing Slack in the automated test — the test intentionally posts to the real webhook (user's choice).

#### Background & Context

- **Why needed**: provides a starter web surface (landing + contact) and proves the repo can route form submissions to Slack via the already-configured `SLACK_URL` secret.
- **Current state**: `SLACK_URL` exists in [.env](.env) and is forwarded to containers via `envVars: ["SLACK_URL"]` in [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js). No code consumes it yet. There is no `package.json`, no `src/`, no server.
- **Who is affected**: developers running the repo locally / in a HubLaunch container.

**Current Behavior**: No web pages exist; `SLACK_URL` is unused by any code.

**Desired Behavior**: Running the server serves `/` (Landing) and `/contact` (Contact form). Submitting the form posts the contents to Slack. An automated test confirms the Slack send works by posting live to the real `SLACK_URL` and asserting HTTP 200 `ok`.

## Detailed Requirements

### Functional Requirements

1. **Landing Page — `GET /`**
   - Returns `200` with `Content-Type: text/html`.
   - Body contains a heading and the text: **"Welcome, we are coming soon."**
   - Includes a link to `/contact` (so the two pages are navigable).

2. **Contact Us Page — `GET /contact`**
   - Returns `200` with `Content-Type: text/html`.
   - Renders an HTML `<form method="POST" action="/api/contact">` with three fields:
     - `email` — `<input type="email" name="email" required>`
     - `subject` — `<input type="text" name="subject" required>`
     - `body` — `<textarea name="body" required></textarea>`
   - A submit button.
   - Supports an optional `?status=ok` / `?status=error` query param to show a success/error banner after redirect (see submit flow).

3. **Form submission — `POST /api/contact`**
   - Read the raw request body, parse as `application/x-www-form-urlencoded` via `URLSearchParams`.
   - Extract `email`, `subject`, `body`.
   - **Validation**: all three must be non-empty (after trim); `email` must contain an `@`. On validation failure, respond `302` redirect to `/contact?status=error` (or `400` for non-browser callers — redirect is fine for the browser flow).
   - Call `sendContactToSlack({ email, subject, body })`.
   - On success: respond `302` redirect to `/contact?status=ok`.
   - On failure (Slack error or missing `SLACK_URL`): log the error server-side (without the URL), respond `302` redirect to `/contact?status=error`.

4. **Slack sender — `sendContactToSlack(contact)`** (in `src/slack.ts`)
   - Signature: `sendContactToSlack(contact: { email: string; subject: string; body: string }): Promise<{ status: number; body: string }>`.
   - Read `process.env.SLACK_URL?.trim()`. If missing/empty → `throw new Error("SLACK_URL environment variable is not set")`.
   - Compose the message text (exact format):
     ```
     New contact form submission
     *Email:* <email>
     *Subject:* <subject>
     *Body:*
     <body>
     ```
   - POST to `SLACK_URL` with header `Content-Type: application/json` and body `JSON.stringify({ text })`.
   - Return `{ status: res.status, body: await res.text() }`.
   - Caller decides success (HTTP 200 + body `ok`). Do **not** log the webhook URL anywhere.

5. **Server entrypoint — `src/server.ts`**
   - Create an `http.createServer` handling the routes above.
   - Listen on `process.env.PORT ?? 3000`.
   - Log the listening URL to stdout on start.
   - 404 for unknown routes.

### Technical Requirements

- **Language/Runtime**: TypeScript executed by Node v24 native type-stripping (`node src/server.ts`). Global `fetch` (Node 18+). Repo Node is **v24.11.1**.
- **Location**: new top-level `src/` directory (`src/server.ts`, `src/slack.ts`, `src/pages.ts`). New `package.json` at repo root. Test in `test/` (new) — note: a 1-byte `test` file exists at repo root; the test directory is `test/` — if the existing `test` file conflicts with creating a `test/` directory, place the test at `src/slack.test.ts` instead (see Edge Cases).
- **Dependencies**: none required at runtime. No test framework dependency — the test is a plain `.ts` script using Node's built-in `node:test` runner and `node:assert` plus the global `fetch` (matches the repo's zero-dep convention). `node --test` is available in Node v24 with no install.
- **Constraints**: `.env` is gitignored and holds `SLACK_URL`. Scripts read from `process.env` — they do NOT parse `.env` themselves. The caller exports `SLACK_URL` (e.g. `set -a; source .env; set +a`) or runs inside the HubLaunch container that forwards it.

### Non-Functional Requirements

- **Security**: never log the full `SLACK_URL` (secret webhook). On error, log status/body only. Escape user-supplied form values when reflecting them into HTML (the pages themselves render static content plus a status banner — do NOT echo raw form input into HTML to avoid XSS; the banner text is fixed strings only). `.env` stays gitignored.
- **Backwards Compatibility**: additive only — new files, no changes to existing bash scripts or config.
- **Error Handling**: fail-fast; `sendContactToSlack` throws on missing config; the HTTP handler catches and redirects to an error state without leaking internals.

## Proposed Solution

**High-level approach**: Add a `src/` folder with a small Node `http` server (`server.ts`), an HTML module (`pages.ts`) producing the two pages, and a Slack module (`slack.ts`) exporting `sendContactToSlack`. Add a minimal root `package.json` (`"type": "module"` + run scripts). Add a test that verifies the Slack send by posting live to the real `SLACK_URL`.

### Key Components

1. **`src/slack.ts`** — `sendContactToSlack()` composes the message and POSTs to `SLACK_URL` via `fetch`. Reusable + testable.
2. **`src/pages.ts`** — pure functions `landingPage(): string` and `contactPage(status?: "ok" | "error"): string` returning HTML strings. Keeps HTML out of routing logic.
3. **`src/server.ts`** — routes `GET /`, `GET /contact`, `POST /api/contact`; parses the form body; calls the Slack sender; redirects with a status.
4. **`test/slack.test.ts`** (or `src/slack.test.ts`) — calls `sendContactToSlack(...)` against the real `SLACK_URL` and asserts HTTP 200 + body `ok`; plus a test asserting it throws when `SLACK_URL` is unset.
5. **`package.json`** — `"type": "module"` + npm scripts (`start`, `test`).

### Files Likely to Change / Create

- `package.json` — NEW. `"type": "module"`, scripts `start` and `test`.
- `src/slack.ts` — NEW. `sendContactToSlack()`.
- `src/pages.ts` — NEW. `landingPage()`, `contactPage()`.
- `src/server.ts` — NEW. HTTP server + routing + form handling.
- `test/slack.test.ts` — NEW. Live Slack send test (posts to real `SLACK_URL`). (Fallback location `src/slack.test.ts` — see Edge Cases about the existing root `test` file.)
- `README.md` — NEW (or append). Usage: export `SLACK_URL`, run server, run test.

### Code Patterns to Follow

- **`SLACK_URL` webhook contract & fail-fast env check**: follow the pattern established in [.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md](.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md) — read `process.env.SLACK_URL?.trim()`, throw/exit on missing, POST `{"text": "..."}`, treat HTTP 200 + body `ok` as success, never log the URL.
- **Zero-dependency, native-`fetch` style**: same prior plan deliberately avoids `axios`/`node-fetch`/`dotenv` and uses global `fetch`. Do the same here.
- **Direct-run guard for reusable modules**: use the ESM idiom `if (import.meta.url === \`file://${process.argv[1]}\`)` if any module needs both an importable export and a direct-run path.

**Anti-Patterns to Avoid:**

- Do NOT add Express, Next.js, React, `axios`, `node-fetch`, `dotenv`, or a test framework — Node v24 provides `http`, `fetch`, `node:assert`, and `node:test`.
- Do NOT hard-code or echo the webhook URL anywhere.
- Do NOT reflect raw user form input back into HTML (XSS risk) — the status banner uses fixed strings only.
- Do NOT introduce a build/transpile pipeline; run `.ts` directly with `node`.

### Reference Implementations (for the implementing agent)

`src/slack.ts`:

```ts
export interface Contact {
  email: string;
  subject: string;
  body: string;
}

/**
 * Post a contact-form submission to Slack via the SLACK_URL Incoming Webhook.
 * Returns the HTTP status and response body. Throws if SLACK_URL is unset.
 * Never logs the webhook URL.
 */
export async function sendContactToSlack(
  contact: Contact,
): Promise<{ status: number; body: string }> {
  const url = process.env.SLACK_URL?.trim();
  if (!url) {
    throw new Error("SLACK_URL environment variable is not set");
  }
  const text = [
    "New contact form submission",
    `*Email:* ${contact.email}`,
    `*Subject:* ${contact.subject}`,
    "*Body:*",
    contact.body,
  ].join("\n");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const body = await res.text();
  return { status: res.status, body };
}
```

`src/pages.ts`:

```ts
const shell = (title: string, inner: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
  `<meta name="viewport" content="width=device-width, initial-scale=1">` +
  `<title>${title}</title></head><body style="font-family:system-ui;max-width:640px;margin:3rem auto;padding:0 1rem">` +
  `${inner}</body></html>`;

export function landingPage(): string {
  return shell(
    "Welcome",
    `<h1>Welcome</h1><p>We are coming soon.</p><p><a href="/contact">Contact us</a></p>`,
  );
}

export function contactPage(status?: "ok" | "error"): string {
  // Banner text is FIXED strings only — never interpolate user input here (XSS).
  const banner =
    status === "ok"
      ? `<p style="color:green">Thanks! Your message was sent.</p>`
      : status === "error"
        ? `<p style="color:red">Sorry, something went wrong. Please try again.</p>`
        : "";
  return shell(
    "Contact Us",
    `<h1>Contact Us</h1>${banner}
     <form method="POST" action="/api/contact">
       <p><label>Email<br><input type="email" name="email" required></label></p>
       <p><label>Subject<br><input type="text" name="subject" required></label></p>
       <p><label>Body<br><textarea name="body" required rows="6"></textarea></label></p>
       <p><button type="submit">Send</button></p>
     </form>
     <p><a href="/">Back home</a></p>`,
  );
}
```

`src/server.ts`:

```ts
import http from "node:http";
import { landingPage, contactPage } from "./pages.ts";
import { sendContactToSlack } from "./slack.ts";

const PORT = Number(process.env.PORT ?? 3000);

function html(res: http.ServerResponse, status: number, body: string): void {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

function redirect(res: http.ServerResponse, location: string): void {
  res.writeHead(302, { Location: location });
  res.end();
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/") {
    return html(res, 200, landingPage());
  }
  if (req.method === "GET" && url.pathname === "/contact") {
    const status = url.searchParams.get("status");
    return html(
      res,
      200,
      contactPage(status === "ok" ? "ok" : status === "error" ? "error" : undefined),
    );
  }
  if (req.method === "POST" && url.pathname === "/api/contact") {
    try {
      const params = new URLSearchParams(await readBody(req));
      const email = (params.get("email") ?? "").trim();
      const subject = (params.get("subject") ?? "").trim();
      const body = (params.get("body") ?? "").trim();
      if (!email.includes("@") || !subject || !body) {
        return redirect(res, "/contact?status=error");
      }
      const { status, body: slackBody } = await sendContactToSlack({ email, subject, body });
      if (status === 200 && slackBody === "ok") {
        return redirect(res, "/contact?status=ok");
      }
      console.error(`Slack send failed: HTTP ${status}, body: ${slackBody}`);
      return redirect(res, "/contact?status=error");
    } catch (err) {
      // Do NOT log the webhook URL; err.message is safe (no URL in it).
      console.error(`Contact submit error: ${(err as Error).message}`);
      return redirect(res, "/contact?status=error");
    }
  }
  html(res, 404, "<h1>404 Not Found</h1>");
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
```

`test/slack.test.ts` — **posts to the real `SLACK_URL` webhook** (live end-to-end, user's choice). Requires a valid `SLACK_URL` in the environment and network access; it posts a visible message to the real Slack channel on each run.

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { sendContactToSlack } from "../src/slack.ts";

test("sendContactToSlack posts a real message to the live SLACK_URL and Slack returns 200 ok", async () => {
  // This is a LIVE test: it requires SLACK_URL to be set and will post to the real channel.
  assert.ok(
    process.env.SLACK_URL?.trim(),
    "SLACK_URL must be set to run the live Slack notification test",
  );

  const result = await sendContactToSlack({
    email: "test@example.com",
    subject: "Automated test — contact form",
    body: "This message was sent by the automated Slack notification test.",
  });

  // Slack Incoming Webhooks return HTTP 200 with the literal body "ok" on success.
  assert.equal(result.status, 200, `expected HTTP 200, got ${result.status} (body: ${result.body})`);
  assert.equal(result.body, "ok", `expected Slack body "ok", got "${result.body}"`);
});

test("sendContactToSlack throws when SLACK_URL is unset", async () => {
  const prev = process.env.SLACK_URL;
  delete process.env.SLACK_URL;
  try {
    await assert.rejects(
      () => sendContactToSlack({ email: "a@b.com", subject: "s", body: "b" }),
      /SLACK_URL environment variable is not set/,
    );
  } finally {
    if (prev !== undefined) process.env.SLACK_URL = prev;
  }
});
```

> The live test reads `SLACK_URL` from the process environment. Export it first (`set -a; source .env; set +a`) or run inside the HubLaunch container that forwards it. The second test deletes `SLACK_URL` only for its own scope and restores it in `finally`, so ordering does not matter.

`package.json`:

```json
{
  "name": "test-hub-launch-web",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/server.ts",
    "test": "node --test"
  }
}
```

> Notes for the implementer:
> - `node --test` auto-discovers files matching `*.test.ts` (Node v24). If discovery misses the `.ts` file on the target setup, run explicitly: `node --test test/slack.test.ts`.
> - Import paths keep the `.ts` extension (required for Node v24 native type-stripping of relative ESM imports).
> - The live test contacts the real Slack webhook and posts a visible message on each run — this is intentional. The missing-config test deletes `SLACK_URL` only for its own scope and restores it in `finally`.

## Implementation Steps

#### Phase 1: Setup

- [ ] Create root `package.json` with `"type": "module"` and scripts `start` / `test` (content above).
- [ ] Create the `src/` directory.

#### Phase 2: Slack sender

- [ ] Create `src/slack.ts` exporting `Contact` and `sendContactToSlack()` (content above).
- [ ] Confirm it never references or logs the webhook URL.

#### Phase 3: Pages

- [ ] Create `src/pages.ts` with `landingPage()` (Welcome / coming soon + link to `/contact`) and `contactPage(status?)` (form + optional status banner). Banner uses fixed strings only.

#### Phase 4: Server & routing

- [ ] Create `src/server.ts` with `GET /`, `GET /contact`, `POST /api/contact`, form parsing via `URLSearchParams`, validation, Slack call, and status redirects (content above).
- [ ] 404 for unknown routes; listen on `PORT ?? 3000`.

#### Phase 5: Test

- [ ] Create `test/slack.test.ts` (or `src/slack.test.ts` if the root `test` file blocks the directory — see Edge Cases) with the **live** test that calls `sendContactToSlack(...)` against the real `SLACK_URL` and asserts HTTP 200 + body `ok`, plus the missing-`SLACK_URL` throw test.

#### Phase 6: Verify & Document

- [ ] Export `SLACK_URL` (`set -a; source .env; set +a`), then run `npm test` (or `node --test test/slack.test.ts`) — the live test posts to Slack and asserts HTTP 200 `ok`; the missing-config test passes. A message appears in the Slack channel.
- [ ] Manually run the server and exercise both pages + the form (see Manual Testing).
- [ ] Add `README.md` documenting export of `SLACK_URL`, `npm start`, and `npm test`.

## Edge Cases & Considerations

#### Edge Cases to Handle

1. **`SLACK_URL` unset/empty** → `sendContactToSlack` throws; `POST /api/contact` catches and redirects to `/contact?status=error`. The dedicated test asserts the throw.
2. **Validation failure** (missing field or email without `@`) → redirect to `/contact?status=error` without calling Slack.
3. **Slack non-200 / body ≠ `ok`** → server logs status/body (not URL) and redirects to `/contact?status=error`.
4. **Existing root `test` file collision**: a 1-byte file named `test` already exists at the repo root. Creating a `test/` **directory** may conflict on case-insensitive/existing-path grounds. If `mkdir test/` fails or the file blocks it, place the test at `src/slack.test.ts` and adjust the import to `./slack.ts`; `node --test` still discovers `*.test.ts` under `src/`. Do NOT delete the existing `test` file.
5. **Empty request body on POST** → `URLSearchParams("")` yields empty params → validation fails → error redirect.
6. **Non-browser POST callers** → redirect responses (302) are still returned; acceptable for this scope.

#### Potential Challenges

- ⚠️ **Node TS execution**: requires Node ≥ 22 (repo has v24.11.1). On older Node, `node src/*.ts` fails — fallback is `npx tsx`. Documented in README.
- ⚠️ **`node --test` `.ts` discovery**: if auto-discovery doesn't pick up `.ts` files, pass the file path explicitly. Documented above.
- ⚠️ **`.env` not auto-loaded**: scripts read the process env only. The runner must export `SLACK_URL` first (`set -a; source .env; set +a`).

#### Security Considerations

- `SLACK_URL` is a secret webhook — never log it; log only status/body on error.
- Do not reflect raw user input into HTML (XSS) — the status banner is fixed strings; the Slack payload interpolates user text but goes to Slack, not back to the browser.
- `.env` stays gitignored (already configured in [.gitignore](.gitignore)).

## Technical Considerations

#### Dependencies

- None required at runtime or for testing. Optional: `tsx@^4` as a dev fallback only if targeting Node < 22.

#### Environment Variables

- `SLACK_URL` — Slack Incoming Webhook URL. Already present in [.env](.env) and forwarded via `envVars: ["SLACK_URL"]` in [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js).
- `PORT` — optional, defaults to `3000`.

#### Error Handling Strategies

- Missing `SLACK_URL` → `sendContactToSlack` throws; handler redirects to error state; server never crashes.
- Slack failure → logged (status/body only) + error redirect.
- Success → 302 redirect to `/contact?status=ok`.

## Testing Requirements

#### Automated Tests (the required Slack-notification test)

- [ ] **`sendContactToSlack` live send**: with a real `SLACK_URL` set, call `sendContactToSlack({ email, subject, body })` and assert it returns `{ status: 200, body: "ok" }` (Slack's success response). This is a **live** test that posts to the real Slack channel and requires network access. If `SLACK_URL` is unset, the test fails with a clear assertion message.
- [ ] **`sendContactToSlack` missing config**: with `SLACK_URL` deleted, assert the function rejects with `SLACK_URL environment variable is not set`. This test restores `SLACK_URL` in `finally`.

#### Manual Testing Checklist

1. **Setup**: export the var from `.env`:
   ```bash
   set -a; source .env; set +a
   ```
2. **Start the server**:
   ```bash
   npm start   # or: node src/server.ts
   ```
   - Expected: stdout `Server listening on http://localhost:3000`.
3. **Landing page**: open `http://localhost:3000/` → shows "Welcome" and "We are coming soon." with a link to Contact.
4. **Contact page**: open `http://localhost:3000/contact` → shows the form (email, subject, body).
5. **Submit (live Slack)**: fill the form and submit → redirected to `/contact?status=ok`, success banner shown, and the message appears in the Slack channel tied to `SLACK_URL`.
6. **Validation**: submit with a bad email (no `@`) → redirected to `/contact?status=error`, no Slack message sent.
7. **Missing config**: `unset SLACK_URL` and submit → error banner; server logs an error; no crash; URL never printed.

#### Test Data Requirements

- The automated live test needs the valid `SLACK_URL` in `.env` (already present) exported into the environment, plus network access. The missing-config test needs nothing.

## Documentation Updates

- [ ] Create/append `README.md` with:
  - How to export `SLACK_URL` (`set -a; source .env; set +a`).
  - `npm start` (or `node src/server.ts`) to run the server; the two routes `/` and `/contact`.
  - `npm test` (or `node --test test/slack.test.ts`) to run the Slack-send test.
  - Note on Node ≥ 22 requirement / `tsx` fallback.
  - Warning that `npm test` posts a **real** message to the Slack channel (live test) and requires `SLACK_URL` + network.

## Acceptance Criteria

- [ ] **AC1**: `GET /` returns HTML containing "Welcome" and "coming soon" and a link to `/contact`.
- [ ] **AC2**: `GET /contact` returns an HTML form with `email`, `subject`, and `body` fields posting to `/api/contact`.
- [ ] **AC3**: Submitting a valid form calls `sendContactToSlack`, which POSTs `{"text": ...}` (containing the three field values) to `SLACK_URL`, and the user is redirected to `/contact?status=ok`.
- [ ] **AC4**: The automated live test passes: with a real `SLACK_URL` set, `sendContactToSlack(...)` posts to Slack and the test asserts HTTP 200 + body `ok` (a message appears in the channel).
- [ ] **AC5**: With `SLACK_URL` unset, `sendContactToSlack` throws and the submit handler redirects to `/contact?status=error` without crashing; the corresponding test passes.
- [ ] **AC6**: The webhook URL is never printed to stdout/stderr.
- [ ] **AC7**: No runtime or test npm dependencies added; server and test run via `node` on Node v24.
- [ ] **AC8**: `README.md` documents setup, running the server, and running the test.

#### Definition of Done

- All acceptance criteria met.
- Automated tests pass (`npm test`).
- Manual test checklist passes (including one live Slack send).
- No changes to existing bash scripts or config beyond additive new files.
- `.env` remains uncommitted.

## Dependencies & Related Work

#### Dependencies

- [ ] Node ≥ 22 runtime (repo: v24.11.1).
- [ ] Valid `SLACK_URL` webhook for manual live testing (present in `.env`).

#### Blockers

- None.

#### Related

- Prior plan establishing the `SLACK_URL` webhook contract: [.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md](.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md).
- Config: `envVars: ["SLACK_URL"]` in [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js).
