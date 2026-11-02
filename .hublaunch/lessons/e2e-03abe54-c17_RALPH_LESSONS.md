# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended marker line to README.md; typecheck passes
- Blockers: None

## Key Discoveries
- Disposable E2E test: single-line append to README.md.
- `npm install` is required before `npm run typecheck` (tsc is a devDependency).
- `ralph.md` was already modified by the harness before the session (adds `npm run build` to the build-commands block) — not part of my change; left untouched.

## Solutions That Worked
- Edit tool to append the exact marker line after the final README line.

## Things to Avoid
- Don't run `npm run test:contact` for a doc-only change — it needs SLACK_URL and does a live Slack send; irrelevant to README marker.

## Files Modified
- README.md (appended one marker line)

## Next Steps
- Done. Ready for PR.
