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

## Web app — Landing + Contact Us pages (`src/`)

A tiny Node `http` server (no framework, no build step) that serves two pages and
routes the Contact form to Slack via the same `SLACK_URL` webhook.

- `GET /` — Landing page ("Welcome — we are coming soon", links to `/contact`).
- `GET /contact` — Contact form with **email**, **subject**, **body** fields.
- `POST /api/contact` — parses the `application/x-www-form-urlencoded` body,
  validates (all non-empty; email contains `@`), calls `sendContactToSlack(...)`,
  then redirects to `/contact?status=ok` on success or `/contact?status=error`
  on validation/Slack failure (a fixed-string banner is shown — user input is
  never reflected into HTML).

### Run the server

```bash
set -a; source .env; set +a   # export SLACK_URL (or run in the HubLaunch container)
npm start                     # or: tsx src/server.ts   (PORT defaults to 3000)
```

Expected stdout: `Server listening on http://localhost:3000`. Open
`http://localhost:3000/` and `http://localhost:3000/contact`. Submitting a valid
form posts a **real** message to the Slack channel tied to `SLACK_URL`.

### Slack-notification test

```bash
npm test                      # or: tsx --test src/slack.test.ts
```

- **Live test:** calls `sendContactToSlack(...)` against the real `SLACK_URL` and
  asserts HTTP `200` + body `ok` — this posts a **real** message to the channel
  and needs `SLACK_URL` + network access. If `SLACK_URL` is unset the test fails.
- **Missing-config test:** asserts `sendContactToSlack` throws
  `SLACK_URL environment variable is not set` (no network), restoring the var in
  `finally`.

### API (`src/slack.ts`)

- `interface Contact { email; subject; body }`
- `sendContactToSlack(contact)` — reads `SLACK_URL` (throws if unset), POSTs
  `{"text": "..."}` to the webhook, returns `{ status, body }`. Never logs the URL.
  The raw env value is normalized (surrounding quotes / a trailing comma left by
  env forwarding are stripped) before the request.

> The test lives at `src/slack.test.ts` (not `test/`) because a 1-byte `test`
> file at the repo root prevents creating a `test/` directory.

## Notes

- `.env` stays uncommitted (gitignored); the webhook URL is never printed.
- Node < 22.6 cannot run `.ts` directly — use the `npm run` scripts (which use
  `tsx`) or `npx tsx scripts/...`. This repo runs Node v20, so all scripts and the
  server/test use `tsx`.
