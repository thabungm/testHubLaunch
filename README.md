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

### Health check — verify Slack webhook is alive

```bash
npm run health                    # print text report, exit 0 (healthy) or 1 (unhealthy)
npm run health -- --html          # also write a self-contained health.html page
npm run health -- --html=status   # write to a custom path
npm run health -- --live          # include a real send ping (channel-visible)
npm run health -- --timeout=3000  # custom timeout in milliseconds
```

The health check probes the `SLACK_URL` webhook **without posting a visible message**
by default. Two checks are performed:

1. **Config check** — `SLACK_URL` is set and matches the Slack webhook shape.
2. **Reachability check** — sends an empty POST to verify the endpoint is alive.

Both checks must pass for `overall` to be `healthy` and exit code to be `0`.

```bash
npm run health              # exit 0 if healthy, 1 if unhealthy

# Output example (healthy):
# Slack Health — HEALTHY
# Target:  hooks.slack.com/services/…
# Checked: 2026-07-17T19:54:00.000Z
#
#   [OK]   config        SLACK_URL is set and is a Slack webhook URL
#   [OK]   reachability  webhook endpoint is live (rejected empty payload)   (123ms)
```

The `--live` flag adds a third check: sends a real message to the channel
(visible to all), asserts HTTP 200, and marks the `live` check as healthy.
This is **opt-in only** so routine health checks never pollute the channel.

The `--html` flag writes a self-contained static HTML page (no external
assets, no server) that displays the same report in the browser.

### Live test — health check

```bash
npm run test:health      # or: tsx scripts/test-health.ts
```

Tests the health check module with:
- **Test 1 (no network):** config validation when `SLACK_URL` is unset or invalid.
- **Test 2 (live):** reachability probe against the real webhook, confirming it is
  online and `overall` is `healthy`.

Prints `ALL PASS` and exits `0` only if all pass.

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
