# testHubLaunch — Landing + Contact Us (Slack notify)

A minimal [Next.js 15](https://nextjs.org/) (App Router) + TypeScript web app with
two pages:

- **Landing page** (`/`) — a "coming soon" placeholder with a link to Contact Us.
- **Contact Us page** (`/contact`) — a form with **email**, **subject**, and
  **body** fields. Submitting POSTs the values to a server Route Handler
  (`POST /api/contact`), which posts a formatted message to a Slack **Incoming
  Webhook** whose URL is read from the `SLACK_URL` environment variable.

`SLACK_URL` is a **secret**: it is read only in server code (`src/lib/slack.ts`,
imported only by the API route), is never prefixed `NEXT_PUBLIC_`, never reaches
the browser bundle, and is never logged.

## Requirements

- **Node ≥ 18.18** (tested on Node 20).
- No HTTP library — the Slack call uses the global `fetch` (built into Node 18+).

## Install

```bash
npm install
```

## Configure `SLACK_URL`

`SLACK_URL` is a Slack Incoming Webhook URL (POST JSON `{"text": "..."}`, returns
the literal string `ok` on success). Next.js **auto-loads `.env`** for `dev`,
`build`, and `start`, so just create a `.env` file (it is gitignored):

```bash
cp .env.example .env
# then edit .env and set a real webhook URL
```

Alternatively, run inside the HubLaunch container, which forwards `SLACK_URL`
(`envVars: ["SLACK_URL"]` in `.hublaunch/hublaunch.config.js`).

## Run

```bash
npm run dev        # dev server on http://localhost:3000
```

- `http://localhost:3000/` — landing page.
- `http://localhost:3000/contact` — contact form.

Fill in the form and click **Send**. On success you'll see
"Thanks! Your message was sent." and a formatted message appears in the Slack
channel. On failure you'll see "Something went wrong. Please try again."

For a production run:

```bash
npm run build
npm run start
```

## Test

The Slack-notification feature is unit-tested with a mocked `fetch` (no live
network, CI-safe):

```bash
npm test           # vitest run (src/lib/slack.test.ts)
```

Covered: payload correctness, success on HTTP 200 + `ok`, failure on non-200,
failure when the body isn't `ok`, failure when `SLACK_URL` is unset, and that the
webhook URL never leaks into an error message.

Type-check everything (Next app + legacy scripts):

```bash
npm run typecheck
```

## Project layout

- `src/app/page.tsx` — landing page.
- `src/app/contact/page.tsx` — contact form (client component).
- `src/app/api/contact/route.ts` — `POST /api/contact` handler (validate → send).
- `src/lib/slack.ts` — `sendSlackNotification` + `formatSlackText` + `ContactInput`.
- `src/lib/slack.test.ts` — Vitest unit tests for the Slack feature.

### API: `POST /api/contact`

Body: `{ "email": string, "subject": string, "body": string }`.

| Outcome | Status | Response |
| --- | --- | --- |
| Success (Slack returned `ok`) | `200` | `{ "ok": true }` |
| Missing/empty field or bad JSON | `400` | `{ "error": "..." }` |
| Slack failure / `SLACK_URL` unset | `502` | `{ "error": "Failed to send notification" }` |

## Legacy CLI scripts (`scripts/`)

An earlier headless variant of the same feature lives in `scripts/` and is still
available (it uses a Block Kit payload and includes a `name` field). It requires
`SLACK_URL` in the environment:

```bash
set -a; source .env; set +a
npm run contact          # send a sample submission to Slack
npm run test:contact     # live send + validation check
```

## Security

- `.env` stays gitignored; only `.env.example` (no real value) is committed.
- `SLACK_URL` is used server-side only and is never printed or bundled to the client.
