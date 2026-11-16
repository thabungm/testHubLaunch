# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE. Plan `.hublaunch/plans/2026-11-16-09-05-add-greeting-helper.md` is fully implemented and verified.
- Last action: committed the 4 planned files on branch e2e-38e0a02-s5.
- Blockers: None

## Key Discoveries
- `node_modules` is absent at the start; run `npm install` (devDependencies only, lockfile is unchanged).
- `/bin/sh` is dash; all E2E scripts in the plan pass under it.
- `SLACK_URL` is NOT set in this sandbox, so `npm run test:contact` (the regression command) exits 1 with
  "FAIL: SLACK_URL not set". The plan says this is expected and not a failure of this change.
- `ralph.md` was already modified by the harness before the session started (it added `npm run build` to
  RALPH_BUILD_COMMANDS). The plan requires that ralph.md stays unchanged, so it was left uncommitted on purpose.
- The plan text contains the string "## End-to-End Test Cases" twice. To extract the JSON block, use the LAST occurrence.

## Solutions That Worked
- E2E runner: /tmp/e2e/run.mjs parses the plan's E2E JSON (slicing from the lastIndexOf of the heading), runs each
  `script` with `sh -c`, and checks the exit code and `expectRegex`. All 10 cases passed.
- Checks: `npm run typecheck` OK, `npm run build` OK, `env -u SLACK_URL npm run test:greet` printed ALL PASS.

## Things to Avoid
- Do not commit ralph.md, node_modules, or this lessons file (out of the plan's scope).
- Do not reformat package.json; E2E case 7 requires `git diff --numstat` = `2 0`.

## Files Modified
- scripts/greet.ts (new)
- scripts/test-greet.ts (new)
- package.json (+2 script lines: greet, test:greet)
- README.md (+12 lines: "## Greeting helper (separate utility)" section appended)

## Open Questions
- None. Possible follow-up from the plan (out of scope): add `npm run test:greet` to RALPH_REGRESSION_COMMANDS.

## Next Steps
- None required. When opening a PR, include the plan's "Departures from the request" sentence in the PR body.

## Regression Fix Attempt: test:contact
- Failure: `npm run test:contact` -> "FAIL: SLACK_URL not set — cannot run live test" (exit 1).
- Cause: environmental, NOT a code regression. test-contact.ts is a live test that posts to Slack and requires
  `SLACK_URL`, which is absent in this sandbox. My diff touches only greet.ts, test-greet.ts, package.json
  (+2 scripts), README.md; nothing in contact.ts / test-contact.ts. The same failure occurs without my changes.
- Not done on purpose: did not fake a SLACK_URL (would send/pretend a real Slack message) and did not make the
  test skip when the variable is missing (would weaken the regression check).
- To get it green: run with a real `SLACK_URL` (e.g. `SLACK_URL=<webhook> npm run test:contact`).
