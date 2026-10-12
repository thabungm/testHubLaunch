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
- `class RateLimitError extends Error` — thrown when a sender exceeds the
  per-email limit; carries `email`, `limit`, `windowMs`, and `retryAfterMs`
  (ms until the next send would be allowed).
- `validateContact(input)` — trims all fields; requires non-empty `name`,
  `subject`, `body`; requires `email` to match `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`.
  Collects **all** issues and throws before any network call.
- `buildSlackPayload(input)` — builds the Block Kit message (header + Name/Email
  fields + Message section) with a `text` fallback; escapes `&`, `<`, `>` in user
  input and truncates to Slack's limits.
- `submitContactForm(input)` — validates, enforces the per-email rate limit
  (throwing `RateLimitError` on breach **before** any network call), then POSTs
  to `SLACK_URL`; resolves with `{ status, body }` (Slack returns `200` + `ok`
  on success).

## Rate limiting

`submitContactForm()` throttles submissions **per sender email** using a
sliding window. The email is normalized with `trim().toLowerCase()`, and the
check runs after validation but before the Slack POST, so invalid submissions
never consume quota. Only **successful (HTTP 200)** sends count toward the
limit — failed or errored POSTs do not. On breach it throws a `RateLimitError`
immediately (no delay, no queue).

Counter state is persisted to a JSON file so the limit survives across the
short-lived CLI processes. The file maps each email to its recent success
timestamps; emptied entries are pruned.

Configuration (read from `process.env` on every call):

| Variable | Default | Meaning |
| --- | --- | --- |
| `CONTACT_RATE_LIMIT_MAX` | `5` | Max successful sends per email per window. |
| `CONTACT_RATE_LIMIT_WINDOW_MS` | `60000` | Window length in ms. |
| `CONTACT_RATE_LIMIT_FILE` | `.contact-rate-limit.json` | Counter file, resolved against `process.cwd()`. |

Invalid, non-numeric, or non-positive `MAX`/`WINDOW_MS` values silently fall
back to their defaults. The default counter file is **gitignored** so it is
never committed, and `RateLimitError` messages include the (user-supplied)
email but never `SLACK_URL`.

- **Smoke-script caveat:** `npm run contact` always uses the fixed email
  `test@example.com`, so running it more than 5 times within a minute will be
  rate-limited (prints `Rate limited: …`, exits `1`). The live test
  (`npm run test:contact`) isolates itself by pointing `CONTACT_RATE_LIMIT_FILE`
  at a fresh temp file per run, so it is never affected.
- **Known limitation:** there is no cross-process file locking; concurrent runs
  may race on the counter file (an accepted trade-off — writes are atomic via a
  temp file + `rename`).

## Notes

- `.env` stays uncommitted (gitignored); the webhook URL is never printed.
- Node < 22.6 cannot run `.ts` directly — use the `npm run` scripts (which use
  `tsx`) or `npx tsx scripts/...`.
