# Contact Us → Slack

A headless "Contact Us" feature (for testing). Given a submission with four
fields — **Name**, **Email**, **Subject**, **Body** — it validates the input and,
on submit, posts a formatted [Slack Block Kit](https://api.slack.com/block-kit)
message to a Slack **Incoming Webhook** URL stored in the `SLACK_URL` environment
variable. There is no web UI or HTTP server — "submit" means calling the exported
`submitContactForm(input)` function.

## Requirements

- **Node ≥ 22.6** to run `.ts` files directly (`node scripts/contact.ts`), or
- Any **Node ≥ 18** using [`tsx`](https://tsx.is/) (the `npm run` scripts below use
  `tsx`, installed as a devDependency, so they work on Node 20+).
- No runtime npm dependencies — the Slack call uses the global `fetch` (Node 18+).

Install the dev tooling (`tsx`, `typescript`, `@types/node`) once:

```bash
npm install
```

## Setup — export `SLACK_URL`

`SLACK_URL` is a Slack Incoming Webhook URL. It is a **secret** and is never
logged. The scripts read it from `process.env` only — they do **not** parse
`.env`. Export it first (`.env` is gitignored):

```bash
set -a; source .env; set +a
```

Or run inside the HubLaunch container, which already forwards `SLACK_URL`.

## Usage

### CLI smoke test — send a sample submission

```bash
npm run contact          # or: tsx scripts/contact.ts
```

Sends a fixed sample submission. On success prints
`Contact submitted to Slack (HTTP 200)` and exits `0`.

### Live test — real send + validation check

```bash
npm run test:contact     # or: tsx scripts/test-contact.ts
```

- **Test 1 (live):** performs a **real** Slack send via `SLACK_URL` and asserts
  HTTP 200. The subject includes an ISO timestamp so the message is easy to find
  in the channel: `PASS (live send): HTTP 200, body: ok`.
- **Test 2 (validation, no network):** confirms invalid input is rejected with a
  `ContactValidationError` and **no** Slack message is sent:
  `PASS (validation): rejected 4 invalid fields`.

Prints `ALL PASS` and exits `0` only if both pass. If `SLACK_URL` is unset it
prints `FAIL: SLACK_URL not set — cannot run live test` and exits `1`.

### Type-check

```bash
npm run typecheck        # tsc --noEmit, strict
```

## API (`scripts/contact.ts`)

- `interface ContactInput { name; email; subject; body }`
- `class ContactValidationError extends Error` — carries `issues: string[]`.
- `validateContact(input)` — trims all fields; requires non-empty `name`,
  `subject`, `body`; requires `email` to match `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`.
  Collects **all** issues and throws before any network call.
- `buildSlackPayload(input)` — builds the Block Kit message (header + Name/Email
  fields + Message section) with a `text` fallback; escapes `&`, `<`, `>` in user
  input and truncates to Slack's limits.
- `submitContactForm(input)` — validates, then POSTs to `SLACK_URL`; resolves with
  `{ status, body }` (Slack returns `200` + `ok` on success).

## Notes

- `.env` stays uncommitted (gitignored); the webhook URL is never printed.
- Node < 22.6 cannot run `.ts` directly — use the `npm run` scripts (which use
  `tsx`) or `npx tsx scripts/...`.

---

# Web app: Landing + Contact Us pages (`src/`)

In addition to the headless `scripts/` API above, `src/` contains a minimal
zero-dependency web app (Node's built-in `http` module) exposing two pages and a
form that posts submissions to Slack via `SLACK_URL`.

## Files

- `src/server.ts` — HTTP server + routing.
- `src/pages.ts` — `landingPage()` / `contactPage(status?)` returning HTML.
- `src/slack.ts` — `sendContactToSlack({ email, subject, body })`, POSTs
  `{"text": ...}` to `SLACK_URL`; returns `{ status, body }`; throws if
  `SLACK_URL` is unset. Never logs the webhook URL.
- `src/slack.test.ts` — the automated Slack-notification test (see below).

## Routes

- `GET /` — Landing page ("Welcome, we are coming soon." + link to `/contact`).
- `GET /contact` — Contact form (email, subject, body). Supports
  `?status=ok` / `?status=error` to show a banner after redirect.
- `POST /api/contact` — parses the `application/x-www-form-urlencoded` body,
  validates (all three fields non-empty, `email` contains `@`), calls
  `sendContactToSlack`, then redirects to `/contact?status=ok` on success or
  `/contact?status=error` on validation/Slack failure (never crashes, never
  leaks the URL).

## Run the server

Export `SLACK_URL` first (`.env` is gitignored, read from `process.env` only):

```bash
set -a; source .env; set +a
npm start          # or: tsx src/server.ts  (Node 24+: node src/server.ts)
```

Expected stdout: `Server listening on http://localhost:3000`. Override the port
with `PORT`. Open `http://localhost:3000/` and `http://localhost:3000/contact`.

## Run the Slack-notification test

```bash
set -a; source .env; set +a
npm test           # or: tsx --test src/slack.test.ts
```

- **Live test:** performs a **real** POST to `SLACK_URL` and asserts HTTP 200 +
  body `ok`. It **posts a visible message to the real Slack channel on every run**
  and requires `SLACK_URL` + network access. If `SLACK_URL` is unset the test
  **fails** with a clear message (a live send cannot be verified without it).
- **Missing-config test:** deletes `SLACK_URL` for its own scope and asserts
  `sendContactToSlack` throws; restores `SLACK_URL` in `finally`. No network.

## Node version note

Node **24+** runs the `.ts` files directly (`node src/server.ts`,
`node --test`). This repo currently runs **Node 20**, which cannot strip types
natively, so the `npm` scripts use [`tsx`](https://tsx.is/) (a devDependency).
