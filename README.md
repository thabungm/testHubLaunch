# Landing & Contact Us Pages

A minimal web app serving two pages: a **Landing Page** ("Welcome, coming soon") and a **Contact Us** page with a form. Submitting the Contact form posts the data to Slack via the `SLACK_URL` Incoming Webhook.

## Requirements

- **Node ≥ 22** (v24.11.1 in this repo) to run `.ts` files directly without a build step.
- No runtime npm dependencies — the server uses `node:http` and global `fetch`.
- Valid `SLACK_URL` in `.env` (already configured) to run the live Slack test.

## Setup — export `SLACK_URL`

`SLACK_URL` is a Slack Incoming Webhook URL. It is a **secret** and is never logged. The server reads it from `process.env` only. Export it first:

```bash
set -a; source .env; set +a
```

Or run inside the HubLaunch container, which already forwards `SLACK_URL`.

## Usage

### Start the server

```bash
npm start   # or: node src/server.ts
```

The server listens on `http://localhost:3000` (or `$PORT` if set). Open a browser:

- **Landing page**: `http://localhost:3000/` — shows "Welcome, we are coming soon."
- **Contact page**: `http://localhost:3000/contact` — shows the contact form with `email`, `subject`, and `body` fields.

Submit the form to post the data to Slack. On success, you'll see a success banner and the message appears in the Slack channel. On error, you'll see an error banner.

### Run tests

```bash
npm test   # or: node --test
```

Two tests:

1. **Live Slack send** — with `SLACK_URL` set, calls `sendContactToSlack()` and asserts HTTP 200 + body `ok`. Posts a real message to the Slack channel.
2. **Missing config** — confirms `sendContactToSlack()` throws when `SLACK_URL` is unset.

⚠️ The live test requires `SLACK_URL` to be set and will post a visible message to the real Slack channel.

## API

**`src/slack.ts`**

- `interface Contact { email; subject; body }`
- `sendContactToSlack(contact)` — POSTs to the `SLACK_URL` webhook. Returns `{ status, body }`. Throws if `SLACK_URL` is unset.

**`src/pages.ts`**

- `landingPage()` — returns HTML for the landing page.
- `contactPage(status?)` — returns HTML for the contact form; optionally shows a success/error banner.

**`src/server.ts`**

- `GET /` — returns the landing page.
- `GET /contact` — returns the contact form (supports `?status=ok` and `?status=error` query params).
- `POST /api/contact` — parses the form, validates, calls `sendContactToSlack()`, and redirects.
- 404 for unknown routes.

## Notes

- `.env` is gitignored; the webhook URL is never logged.
- Form submission is a simple HTML form with no client-side JavaScript.
- Email must contain an `@`; all three fields must be non-empty after trimming.
- On validation failure or Slack error, the user is redirected to an error page; no message reaches Slack.
