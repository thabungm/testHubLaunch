# Contact Us → Slack

> This repo contains **two** independent implementations of the "Contact Us →
> Slack" idea:
>
> 1. **Web app (Next.js 15, App Router)** — a Landing page (`/`) and a Contact
>    form (`/contact`) that POSTs to a server Route Handler (`/api/contact`)
>    which notifies Slack. See **[Web App (Next.js)](#web-app-nextjs)** below.
> 2. **Headless script** — the original `scripts/contact.ts` API described in the
>    rest of this document.
>
> Both read the Slack Incoming Webhook URL from the `SLACK_URL` environment
> variable and never log it.

## Web App (Next.js)

A minimal Next.js 15 (App Router) + TypeScript site with two pages and one
server endpoint:

- **`/`** — Landing page: a "Welcome — we're coming soon." message with a link
  to the contact page.
- **`/contact`** — Contact form with three fields (**email**, **subject**,
  **body**) and a **Send** button. Submitting POSTs JSON to `/api/contact`.
- **`/api/contact`** (server Route Handler) — validates the input and calls
  `sendSlackNotification()` from `src/lib/slack.ts`, which POSTs a formatted
  message to the Slack Incoming Webhook at `SLACK_URL`. Returns `200` on
  success, `400` on invalid input, `502` on a Slack/network failure.

### Prerequisites

- Node **≥ 18.18** (this repo runs Node 20+; Next.js 15 requires ≥ 18.18).

### Install

```bash
npm install
```

### `SLACK_URL`

`SLACK_URL` is a Slack Incoming Webhook URL and is a **secret**. It is read
**only** in server code (`src/lib/slack.ts`, invoked by `/api/contact`), is never
prefixed `NEXT_PUBLIC_`, is never sent to the browser, and is never logged.

Next.js **auto-loads `.env`** for `dev`/`build`/`start`, so `process.env.SLACK_URL`
is populated locally without extra tooling. See [`.env.example`](.env.example) for
the expected shape. `.env` stays gitignored.

### Run

```bash
npm run dev      # http://localhost:3000  → Landing;  /contact → the form
npm run build    # production build; must compile with no type errors
npm start        # serve the production build
```

### Test

```bash
npm test         # runs the Vitest suite in src/lib/slack.test.ts (fetch mocked)
```

The test exercises the Slack-notification feature with a mocked global `fetch`
(no live network): payload correctness, success on HTTP 200 + `ok`, failure on
non-200 and body ≠ `ok`, a throw when `SLACK_URL` is unset, and that the webhook
URL never leaks into error messages.

---

## Headless script (`scripts/contact.ts`)

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
