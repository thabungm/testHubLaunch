# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed c446705 "chore: append hula-e2e marker to README" (README.md only, +1 line)
- Blockers: None

## Key Discoveries
- Plan = append one HTML-comment marker line to README.md. README already ended with "\n", so `printf '%s\n' ... >> README.md` appends cleanly.
- `ralph.md` was already modified (` M`) before the session started. It is not part of the plan, so it was left out of the commit.
- No CONTRIBUTING.md and no PR template (.github/ only contains scripts/), so no DCO sign-off is needed.
- `npm run test:contact` exits 1 right away when SLACK_URL is unset (no .env in the sandbox). The live-send test is gated before the validation test.

## Solutions That Worked
- Check commands: `npm run typecheck` -> exit 0, `npm run build` -> exit 0.
- To run the offline validation test on its own: write a temp `.mts` file (NOT `.ts`) outside the repo that imports `/workspace/scripts/contact.ts` and calls `validateContact` with bad input, then run `npx tsx file.mts`. Result: PASS (4 invalid fields rejected).

## Things to Avoid
- `npx tsx -e '...'` and a temp `.ts` file in /tmp both fail with "Top-level await is currently not supported with the cjs output format". contact.ts uses top-level await, and code outside the `"type": "module"` package gets compiled as CJS. Use `.mts` instead.
- Don't commit the lessons file or ralph.md in the plan commit. The acceptance check requires `git log -1 --stat` to show only README.md.

## Files Modified
- README.md (appended marker line), committed in c446705

## Open Questions
- None. The live Slack send can't be tested in this sandbox because SLACK_URL isn't provided. This is expected for a README-only change.

## Next Steps
- None. The plan is complete. The PR should be closed unmerged (disposable E2E).
