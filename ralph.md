# test-hub-launch-contact

A headless TypeScript "Contact Us" feature. It validates a four-field submission
(Name, Email, Subject, Body) and posts it as a Slack Block Kit message via a
Slack Incoming Webhook (`SLACK_URL`). No web UI or HTTP server — logic lives in
`scripts/contact.ts` and is exercised by `scripts/test-contact.ts`. TypeScript
runs via `tsx`; no runtime npm dependencies (uses global `fetch`).

## Setup

Install dependencies:

    npm install

## Verification

Type-check with `tsc --noEmit` (via the `typecheck` script). There is no build
step (no bundling/compilation output beyond type-checking). Tests run via the
`test:contact` script, which performs a live Slack send (requires `SLACK_URL`)
plus an input-validation check with no network call.

<!-- RALPH_CHECK_COMMANDS
npm run typecheck
RALPH_CHECK_COMMANDS_END -->

<!-- RALPH_BUILD_COMMANDS
RALPH_BUILD_COMMANDS_END -->

<!-- RALPH_REGRESSION_COMMANDS
npm run test:contact
RALPH_REGRESSION_COMMANDS_END -->
