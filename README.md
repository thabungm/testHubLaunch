# Landing + Contact Us Web App → Slack

A minimal, zero-runtime-dependency web app (Node's built-in `http` module) that
serves two pages and forwards the contact form to Slack:

- **`GET /`** — Landing page ("Welcome, we are coming soon." + link to Contact).
- **`GET /contact`** — Contact Us form with **email**, **subject**, **body** fields.
- **`POST /api/contact`** — parses the `application/x-www-form-urlencoded` body,
  validates it, calls `sendContactToSlack(...)`, and redirects to
  `/contact?status=ok` on success or `/contact?status=error` on failure.

On a valid submit the server POSTs `{"text": "..."}` to the Slack **Incoming
Webhook** URL in the `SLACK_URL` environment variable. Slack returns HTTP `200`
with body `ok` on success. The webhook URL is a secret and is **never logged**.

Source: `src/server.ts` (routing), `src/pages.ts` (HTML), `src/slack.ts`
(`sendContactToSlack`). Test: `src/slack.test.ts`.

## Run the web app

> **Node version:** this repo runs on **Node v20**, which cannot strip TypeScript
> types natively, so the scripts use [`tsx`](https://tsx.is/) (a devDependency).
> On **Node ≥ 22.6** you can also run the files directly, e.g. `node src/server.ts`.

```bash
npm install                 # installs tsx / typescript / @types/node
set -a; source .env; set +a # export SLACK_URL (see Setup below); optional for browsing
npm start                   # tsx src/server.ts  ->  http://localhost:3000
```

Then open:

- `http://localhost:3000/` — landing page.
- `http://localhost:3000/contact` — contact form. Submitting a valid form posts a
  message to the Slack channel tied to `SLACK_URL` and shows a success banner.
  Set `PORT` to change the port (defaults to `3000`).

If `SLACK_URL` is unset, a submit safely redirects to the error banner (the
server logs the error without the URL and does not crash).

## Test the Slack send

```bash
set -a; source .env; set +a   # export a real SLACK_URL (required for the live test)
npm test                      # tsx --test src/slack.test.ts
```

`npm test` runs two `node:test` cases:

1. **Live send** — calls `sendContactToSlack(...)` against the real `SLACK_URL`
   and asserts HTTP `200` + body `ok`. ⚠️ This is a **live** test: it posts a
   **real, visible message** to the Slack channel and needs network access. If
   `SLACK_URL` is unset the test fails with a clear assertion message.
2. **Missing config** — asserts `sendContactToSlack` throws
   `SLACK_URL environment variable is not set` (no network needed); it restores
   `SLACK_URL` in `finally`.

---

# Contact Us → Slack (headless module)

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
