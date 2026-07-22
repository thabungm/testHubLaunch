# Landing + Contact Us → Slack

Two things live in this repo:

1. **A small web app** (`src/`) — a **Landing page** (`GET /`) and a **Contact Us
   page** (`GET /contact`) with a form (email, subject, body). Submitting the form
   (`POST /api/contact`) posts the message to a Slack **Incoming Webhook** URL stored
   in the `SLACK_URL` environment variable. Built on Node's built-in `http` module —
   no framework, no build step, zero runtime dependencies.
2. **A headless API** (`scripts/`) — the original `submitContactForm(input)`
   function (Name/Email/Subject/Body) documented further down.

## The web app (`src/`)

| Route | Method | Purpose |
| --- | --- | --- |
| `/` | GET | Landing page — "Welcome / We are coming soon." + link to Contact |
| `/contact` | GET | Contact form (email, subject, body). `?status=ok`/`?status=error` shows a banner |
| `/api/contact` | POST | Parses the form, sends to Slack, redirects to `/contact?status=ok\|error` |

### Run the server

```bash
set -a; source .env; set +a   # export SLACK_URL (see Setup below)
npm start                     # or: tsx src/server.ts   → http://localhost:3000
```

`PORT` overrides the default `3000`. Open `http://localhost:3000/`, click through to
`/contact`, fill in the form and submit — a message appears in the Slack channel and
you are redirected to `/contact?status=ok`. A bad email (no `@`) or an empty field
redirects to `/contact?status=error` without contacting Slack. If `SLACK_URL` is
unset the submit handler logs a safe error (never the URL) and redirects to the error
state; the server does not crash.

### Test the Slack send

```bash
set -a; source .env; set +a
npm test                      # or: tsx --test src/slack.test.ts
```

- **Live test:** calls `sendContactToSlack(...)` against the real `SLACK_URL` and
  asserts HTTP `200` + body `ok`. ⚠️ This posts a **real** message to the Slack
  channel on every run and requires `SLACK_URL` to be set plus network access.
- **Missing-config test:** deletes `SLACK_URL` for its own scope and asserts the
  function throws `SLACK_URL environment variable is not set` (no network), then
  restores it.

### Slack sender API (`src/slack.ts`)

- `interface Contact { email; subject; body }`
- `sendContactToSlack(contact)` — reads `SLACK_URL` (throwing if unset), POSTs
  `{"text": ...}` (the three fields) to the webhook, and resolves with
  `{ status, body }`. Never logs the webhook URL. Tolerates a `SLACK_URL` value that
  some environments inject with wrapping quotes or a trailing comma.

---

## The headless API (`scripts/`)

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
