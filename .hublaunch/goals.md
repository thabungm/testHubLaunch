# Project Goals

Inferred from `README.md`, `package.json`, and `ralph.md`. These capture the
owner's intent so future HubLaunch assessments can judge requests against them.

## Primary goal
Provide a headless "Contact Us → Slack" submission feature (for testing). Given a
submission with four fields — **Name**, **Email**, **Subject**, **Body** — the code
validates the input and, on submit, posts a formatted
[Slack Block Kit](https://api.slack.com/block-kit) message to a Slack **Incoming
Webhook** URL held in the `SLACK_URL` environment variable. There is no web UI or
HTTP server; "submit" means calling the exported `submitContactForm(input)`.

## Functional expectations
- `validateContact(input)` trims all fields; requires non-empty `name`, `subject`,
  `body`; requires `email` to match `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`. Collects **all**
  issues and throws a `ContactValidationError` before any network call.
- `buildSlackPayload(input)` builds the Block Kit message (header + Name/Email
  fields + Message section) with a `text` fallback; escapes `&`, `<`, `>` in user
  input and truncates to Slack's limits.
- `submitContactForm(input)` validates, then POSTs to `SLACK_URL`; resolves with
  `{ status, body }` (Slack returns `200` + `ok` on success).

## Technical constraints
- TypeScript executed via `tsx`; runnable on Node ≥ 18 (or Node ≥ 22.6 directly).
- No runtime npm dependencies — the Slack call uses global `fetch`.
- No build/bundling step; verification is type-check only.
- `SLACK_URL` is a secret, read from `process.env` only, never logged; `.env` stays
  gitignored and uncommitted.

## Verification
- Type-check: `npm run typecheck` (`tsc --noEmit`, strict) — zero errors.
- Regression: `npm run test:contact` — Test 1 performs a real Slack send and
  asserts HTTP 200; Test 2 confirms invalid input is rejected with no network call.
  Prints `ALL PASS` and exits `0` only if both pass.
