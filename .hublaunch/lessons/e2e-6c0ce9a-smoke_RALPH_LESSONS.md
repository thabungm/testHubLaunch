# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended marker line to README.md and committed (89a95d8): only README.md in commit
- Blockers: None for the plan. `npm run test:contact` can't pass in this sandbox (SLACK_URL not set)

## Key Discoveries
- Plan is a one-line disposable E2E smoke change: append marker to README.md.
- README.md already ended with a trailing newline, so `printf '%s\n' ... >> README.md` appends cleanly.
- `ralph.md` had a pre-existing uncommitted change (adds `npm run build`). It's outside the plan, so it was left alone and not committed.
- `node scripts/build.mjs` run directly exits 127 (`tsc` not on PATH). Through `npm run build` it passes (exit 0), because npm adds node_modules/.bin to PATH.
- `npm run test:contact` is a live Slack test. It fails with "SLACK_URL not set" both before and after the change, so the cause is the environment, not the change.

## Solutions That Worked
- Check real exit codes with `cmd >/dev/null 2>&1; echo $?`. Piping through `tail` hides the exit status.

## Things to Avoid
- Don't commit ralph.md or this lessons file. The acceptance check expects `git log -1 --stat` to show only README.md.

## Files Modified
- README.md (committed in 89a95d8)

## Verification
- npm run typecheck: exit 0
- npm run build: exit 0
- npm run test:contact: FAIL, SLACK_URL not set (same failure before the change)

## Open Questions
- None

## Next Steps
- None. Plan complete. (This launch is disposable: close the PR unmerged.)
