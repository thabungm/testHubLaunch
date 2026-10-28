# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: Complete
- Last action: Appended hula-e2e marker to README.md, committed README.md only
- Blockers: None

## Key Discoveries
- Disposable E2E smoke test: single change = append marker line to README.md.
- `tsc` is not installed until `npm install` is run; typecheck passes after install.
- `npm run test:contact` does a LIVE Slack send and FAILs with "SLACK_URL not set"
  in this container — environment limitation, unrelated to the README-only change.

## Solutions That Worked
- Edit appended `<!-- hula-e2e e2e-5304ad7-1902 e2e-5304ad7-smoke -->` as last line.

## Things to Avoid
- Do not commit ralph.md or the lessons file — the manual checklist requires the PR
  commit to touch ONLY README.md.

## Files Modified
- README.md (appended marker line)

## Open Questions
- None

## Next Steps
- Done. PR commit contains only README.md.
