# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE (pending real-Slack live send only, blocked on missing webhook)
- Last action: Implemented all files, typecheck clean, all paths verified vs mock
- Blockers: SLACK_URL not available -> genuine live send to real Slack cannot run;
  full flow verified against a local mock Slack server (POST JSON -> 200 "ok").

## What was built
- scripts/contact.ts  — ContactInput, ContactValidationError, validateContact,
  esc, buildSlackPayload (Block Kit), submitContactForm, direct-run main() guard.
- scripts/test-contact.ts — live send (assert 200) + validation-rejection test.
- package.json — "type":"module"; scripts: contact/test:contact use tsx; typecheck.
  devDeps: tsx, typescript, @types/node.
- tsconfig.json — strict, moduleResolution Bundler, allowImportingTsExtensions.
- README.md — setup + usage + Node/tsx notes.
- .gitignore — added node_modules/.

## Verification results (all PASS)
- typecheck (tsc --noEmit, strict): 0 errors.
- validation collects all 4 issues; whitespace-only rejected; bad-email rejected;
  valid passes; validate-before-send; missing SLACK_URL throws exact message.
- payload: 3 blocks, header plain_text truncated <=150, name/text escaped
  (&amp;/&lt;/&gt;), 2 mrkdwn fields, body truncated ~2900.
- full POST flow vs mock: method POST, Content-Type application/json, JSON body,
  returns {200,"ok"}; non-200 (404) returned + reported; test-contact ALL PASS;
  contact.ts CLI smoke prints "Contact submitted to Slack (HTTP 200)".
- missing SLACK_URL: test-contact prints FAIL + exit 1.

## Key Discoveries
- **Node version is v20.20.2, NOT v24.11.1** as the plan assumes. Node 20 CANNOT
  natively strip TS types (`node scripts/x.ts` -> SyntaxError). Confirmed.
- `tsx` v4.23.1 works via `npx tsx`. Must use tsx to run the .ts scripts on this
  Node 20 box. Add tsx as a devDependency and make npm scripts use tsx.
- **SLACK_URL is NOT set** in the environment and there is NO `.env` file in the
  worktree. `hublaunch.config.js` (which forwards SLACK_URL) is gitignored and
  absent here. => the live Slack send (AC2) cannot hit real Slack without a webhook.
- Repo had no package.json, no scripts/ dir, no README before this work.
- `.gitignore` ignores `.env` and `hublaunch.config.js`.

## Solutions That Worked
- Verify full sender flow with a LOCAL HTTP server that returns 200 "ok" as a
  stand-in for the Slack webhook (proves POST/headers/body/response parsing).

## Things to Avoid
- Do NOT use `node scripts/*.ts` in npm scripts on this box — Node 20 fails. Use tsx.

## Files Modified
- (pending) package.json, scripts/contact.ts, scripts/test-contact.ts, README.md

## Open Questions
- Real SLACK_URL webhook needed to complete a genuine live Slack send (AC2).

## Next Steps
- Implement contact.ts, test-contact.ts, package.json, README.md
- Verify validation + missing-var + non-200 paths (no real webhook needed)
- Verify full POST path against a local mock server
