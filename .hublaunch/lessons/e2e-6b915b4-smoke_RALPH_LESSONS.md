# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed 079a18e "docs: append hula-e2e smoke marker to README" (README.md only, +1 line)
- Blockers: None

## Key Discoveries
- The plan is a disposable E2E smoke test: append one marker line to README.md and nothing else.
- README.md already ended with a trailing newline, so `echo '<marker>' >> README.md` was enough.
- `ralph.md` showed as modified (`+npm run build` under RALPH_BUILD_COMMANDS) before the session started. The harness made that change, not this task, so it was left unstaged and uncommitted.
- `npm run test:contact` exits 1 straight away when `SLACK_URL` is not set ("FAIL: SLACK_URL not set"). The sandbox has no SLACK_URL, so the live Slack send cannot run here.

## Solutions That Worked
- To run only the offline validation check, write a scratch .ts under `.hublaunch/tmp/` (gitignored) that imports `validateContact` and `ContactValidationError` from `../../scripts/contact.ts`, then run it with `npx tsx`. It printed "PASS (validation): rejected 4 invalid fields".
- `npm run typecheck` exit 0, `npm run build` exit 0.

## Things to Avoid
- Don't commit `ralph.md` or this lessons file: the acceptance check is that `git log -1 --stat` shows only README.md.
- Never print SLACK_URL. Check only whether it is set.

## Files Modified
- README.md (appended the marker line, committed)

## Open Questions
- None.

## Next Steps
- None. The plan is fully done. The PR or webhook stage is handled by the harness.
