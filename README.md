# testHubLaunch — Landing Page + Contact Us (Slack notify)

A minimal **Next.js 15 (App Router) + TypeScript** web app with two pages:

- **Landing Page** (`/`) — a "coming soon" placeholder with a link to Contact Us.
- **Contact Us** (`/contact`) — a form with **email**, **subject**, and **body**.
  Submitting it POSTs to a server Route Handler (`/api/contact`) which posts a
  formatted message to a Slack **Incoming Webhook** URL held in `SLACK_URL`.

`SLACK_URL` is a **secret**: it is read only in server code (`src/lib/slack.ts`
via `/api/contact`), is never prefixed `NEXT_PUBLIC_`, never reaches the browser,
and is never logged.

## Prerequisites

- Node **≥ 18.18** (repo tested on Node 20). Global `fetch` is built in — no HTTP
  library is used.

## Install

```bash
npm install
```

## Configure `SLACK_URL`

`SLACK_URL` is a Slack Incoming Webhook URL (POST JSON `{"text":"..."}`, returns
the literal string `ok` on success). Next.js **auto-loads `.env`** for
`dev`/`build`/`start`, so just create a `.env` (gitignored) from the example:

```bash
cp .env.example .env
# then edit .env and set a real SLACK_URL=https://hooks.slack.com/services/...
```

Inside a HubLaunch container `SLACK_URL` is already forwarded via
`envVars: ["SLACK_URL"]`, so no `.env` is needed there.

## Run

```bash
npm run dev      # http://localhost:3000
```

- `/` — Landing page ("Welcome — we're coming soon." + Contact link).
- `/contact` — the contact form. On submit you'll see "Sending…", then either
  "Thanks! Your message was sent." (success) or a generic error message.

Production build / serve:

```bash
npm run build    # compiles; must have zero type errors
npm run start
```

## Test

```bash
npm test         # Vitest — src/lib/slack.test.ts (fetch is mocked; no live network)
```

The suite covers the Slack notification feature: payload correctness, success on
HTTP 200 + `ok`, failure on non-200, failure when the body isn't `ok`, throwing
when `SLACK_URL` is unset, and that the webhook URL is never leaked in errors.

Type-check the whole project:

```bash
npm run typecheck   # tsc --noEmit
```

## How it works

| File | Role |
| --- | --- |
| `src/app/page.tsx` | Landing page (static). |
| `src/app/contact/page.tsx` | Contact form (client component) with sending/success/error states. |
| `src/app/api/contact/route.ts` | Server Route Handler: validates input, delegates to `slack.ts`, maps outcomes to `200`/`400`/`502`. |
| `src/lib/slack.ts` | `formatSlackText()` (pure) + `sendSlackNotification()` (reads `SLACK_URL`, POSTs to Slack). |
| `src/lib/slack.test.ts` | Vitest unit tests for the Slack feature (mocked `fetch`). |

### API behavior (`POST /api/contact`)

- `200 {ok:true}` — valid input, Slack accepted it (HTTP 200 + `ok`).
- `400 {error:"Missing or invalid fields"}` — a field is empty after trim.
- `400 {error:"Invalid JSON"}` — the request body isn't valid JSON.
- `502 {error:"Failed to send notification"}` — `SLACK_URL` unset, or Slack
  returned non-200 / body ≠ `ok`, or the network call failed. The server logs
  the failure **without** the webhook URL.

## CLI scripts (separate, headless variant)

The repo also ships a headless CLI variant of the contact feature under
`scripts/` (four fields: name/email/subject/body, Slack Block Kit). It shares the
same `SLACK_URL` secret convention. Export the env first (`.env` is gitignored):

```bash
set -a; source .env; set +a
npm run contact        # send a sample submission to Slack (tsx scripts/contact.ts)
npm run test:contact   # live send + validation check (tsx scripts/test-contact.ts)
```

See the inline docs in `scripts/contact.ts` for the exported API.
