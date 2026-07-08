# testHubLaunch — Landing + Contact Us (Slack notify)

A minimal Next.js 15 (App Router) + TypeScript app with two pages:

- **`/`** — Landing page ("Welcome — we're coming soon.") with a link to the contact page.
- **`/contact`** — A contact form (email, subject, message). Submitting it POSTs to a
  server Route Handler (`POST /api/contact`), which forwards the submission to Slack via
  an Incoming Webhook.

## Prerequisites

- Node.js ≥ 18.18 (repo is developed on Node 20+).

## Setup

```bash
npm install
```

Provide a Slack Incoming Webhook URL via the `SLACK_URL` environment variable. Next.js
auto-loads `.env` for `dev`/`build`/`start`, so the simplest option is a local `.env`:

```bash
cp .env.example .env
# edit .env and set SLACK_URL to your real webhook
```

`SLACK_URL` is a **secret**. It is read **server-side only** (in `src/lib/slack.ts`, imported
only by the server route). It is never prefixed `NEXT_PUBLIC_`, never sent to the browser,
and never logged. `.env` is gitignored — only `.env.example` (no real value) is committed.

## Run

```bash
npm run dev
```

Then open:

- http://localhost:3000/ — landing page
- http://localhost:3000/contact — contact form

Fill in the form and click **Send**. On success you'll see "Thanks! Your message was sent."
and a formatted message will appear in your Slack channel. On failure you'll see a generic
error message.

## Test

```bash
npm test
```

Runs the Vitest suite in `src/lib/slack.test.ts`, which exercises the Slack-notification
feature with a mocked `fetch` (no live network). It asserts payload correctness, the HTTP
200 + `ok` success contract, failure on non-200 / body ≠ `ok`, a thrown error when
`SLACK_URL` is unset, and that the webhook URL never leaks into error messages.

## Build

```bash
npm run build
```

Compiles the app and type-checks it (must pass with no TypeScript errors).

## How it works

1. The contact page (`src/app/contact/page.tsx`) is a client component. On submit it POSTs
   `{ email, subject, body }` as JSON to `/api/contact`.
2. The Route Handler (`src/app/api/contact/route.ts`, Node.js runtime) validates the input
   and calls `sendSlackNotification(...)`.
3. `sendSlackNotification` (`src/lib/slack.ts`) reads `process.env.SLACK_URL` and POSTs
   `{"text": "..."}` to the webhook. Success = HTTP 200 with response body `ok`.

The browser never talks to Slack directly and never sees `SLACK_URL`.
