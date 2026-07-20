# testHubLaunch — Landing + Contact Us (Slack notify)

A minimal **Next.js 15 (App Router) + TypeScript** web app with two pages:

- **Landing** (`/`) — a "coming soon" placeholder with a link to the contact page.
- **Contact Us** (`/contact`) — a form with **email**, **subject**, and **body**
  fields. Submitting POSTs the values to a server Route Handler
  (`POST /api/contact`), which posts a formatted message to a Slack **Incoming
  Webhook** whose URL is read from the `SLACK_URL` environment variable.

## Prerequisites

- Node **≥ 18.18** (this repo runs on Node 20+).
- A Slack **Incoming Webhook** URL for `SLACK_URL` (for real sends).

## Install

```bash
npm install
```

## `SLACK_URL` (secret, server-side only)

`SLACK_URL` is a Slack Incoming Webhook URL and is a **secret**:

- It is read **only** in server code (`src/app/api/contact/route.ts` →
  `src/lib/slack.ts`). It is **never** prefixed `NEXT_PUBLIC_`, never sent to the
  browser, and never logged.
- Next.js auto-loads `.env` for `dev`/`build`/`start`, so `process.env.SLACK_URL`
  is populated locally. `.env` is gitignored. See [`.env.example`](.env.example).

```bash
# .env
SLACK_URL=https://hooks.slack.com/services/XXXX/YYYY/ZZZZ
```

## Run

```bash
npm run dev      # http://localhost:3000
```

- `/` → "Welcome — we're coming soon." with a link to `/contact`.
- `/contact` → the form. Fill email/subject/body and click **Send**:
  - Success → "Thanks! Your message was sent." (form clears) and a message
    appears in the Slack channel.
  - Failure → "Something went wrong. Please try again." (`/api/contact`
    returns `502`; the webhook URL is never logged).

## Test

```bash
npm test          # Vitest — Slack notification feature (fetch mocked, no network)
npm run typecheck # tsc --noEmit
npm run build     # next build (production compile)
```

The Slack feature is factored into `src/lib/slack.ts`
(`sendSlackNotification` + pure `formatSlackText`). `src/lib/slack.test.ts`
mocks `globalThis.fetch` and asserts payload correctness, success on HTTP
200 + `ok`, failure on non-200 / body ≠ `ok`, a throw when `SLACK_URL` is unset,
and that the webhook URL never leaks into error messages.

## Project layout

| Path                            | Purpose                                        |
| ------------------------------- | ---------------------------------------------- |
| `src/app/page.tsx`              | Landing page (`/`)                             |
| `src/app/contact/page.tsx`      | Contact form (client component)                |
| `src/app/api/contact/route.ts`  | `POST /api/contact` — validate + send to Slack |
| `src/lib/slack.ts`              | `sendSlackNotification`, `formatSlackText`     |
| `src/lib/slack.test.ts`         | Vitest unit test for the Slack feature         |

## Legacy scripts

`scripts/contact.ts` / `scripts/test-contact.ts` contain an earlier headless
(CLI) contact-to-Slack implementation, kept for reference:

```bash
npm run contact        # send a sample submission to Slack
npm run test:contact   # live send + validation check
```
