# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended marker line to README.md, committed (f6f8695)
- Blockers: None

## Key Discoveries
- `tsc` not on PATH until `npm install` runs; install adds 6 packages.
- `npm run test:contact` requires a live `SLACK_URL` secret (not provisioned in this container), so it fails with "SLACK_URL not set" — environmental, not a code issue. The change is a README-only doc marker and touches no code path.

## Solutions That Worked
- Appended `<!-- hula-e2e e2e-6a43910-2138 e2e-6a43910-smoke2 -->` as a trailing line in README.md.
- `npm run typecheck` passes with zero errors.

## Things to Avoid
- Don't try to "fix" the test:contact failure — it's a missing secret, not a bug.

## Files Modified
- README.md (added trailing marker line)

## Open Questions
- None

## Next Steps
- Done. Ready for PR.
