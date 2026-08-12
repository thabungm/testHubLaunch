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

## Notes

- `.env` stays uncommitted (gitignored); the webhook URL is never printed.
- Node < 22.6 cannot run `.ts` directly — use the `npm run` scripts (which use
  `tsx`) or `npx tsx scripts/...`.

## Health Check

A non-intrusive Slack webhook health check that verifies the `SLACK_URL` is
configured and the endpoint is alive — without posting a visible message to the
channel by default.

### Usage

```bash
npm run health           # Non-intrusive health report; exit 0 (healthy) or 1 (unhealthy)
npm run health -- --html            # Also write a self-contained health.html page
npm run health -- --html=status.html  # Write to a custom path
npm run health -- --live            # Additionally send a real ping (channel-visible)
npm run health -- --timeout=3000    # Custom timeout in ms (default 5000)
npm run test:health     # Live + no-network test
```

### Checks Performed

1. **Config (no network):** `SLACK_URL` is set and matches the Slack Incoming Webhook URL shape.
2. **Reachability (non-intrusive):** probes the webhook with an empty `POST` (does **not** post a
   visible message). Slack replies with HTTP 400 if the endpoint is live. Returns `unhealthy` if the
   endpoint is dead (HTTP 404, `no_service`), unreachable (network error), or times out.
3. **Live send (opt-in, `--live` only):** posts a real `✅ Slack health check <timestamp>` message
   and asserts HTTP 200 + body `ok`. This is **channel-visible** and is off by default. Use only when
   you need to verify end-to-end delivery, not for routine monitoring.

### Exit Codes

- Exit `0`: all checks pass (healthy).
- Exit `1`: any check fails (unhealthy), or `SLACK_URL` is not set (no test run at all).

### Notes

- The default health run (without `--live`) performs a **non-intrusive probe** — it checks that the
  webhook endpoint is alive but does **not** post a message to the channel, so it can be run
  frequently and repeatedly.
- The `SLACK_URL` value and its token path are never logged, printed to the HTML, or included in
  error messages — only a redacted host (e.g. `hooks.slack.com/services/…`) is displayed.
- The `--html` option writes a self-contained, static HTML page with no external scripts or styles,
  so it opens offline and in any browser.
