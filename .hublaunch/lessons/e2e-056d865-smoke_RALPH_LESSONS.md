# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended marker line to README.md, verified, ready to commit
- Blockers: None

## Key Discoveries
- Disposable E2E smoke test. Single change: append marker line to README.md.
- `tsc` is not on PATH until `npm install` is run (installs typescript devDep).
- `npm run test:contact` requires SLACK_URL (live Slack send); it is NOT set in
  this sandbox and there is no .env — so it exits 1 with "SLACK_URL not set".
  This is an environment limitation, NOT a regression from the change.

## Solutions That Worked
- Edit README.md to append `<!-- hula-e2e e2e-056d865-1740 e2e-056d865-smoke -->`
- `npm install` then `npm run typecheck` (passes) and `npm run build` (exit 0).

## Things to Avoid
- Don't treat the test:contact SLACK_URL failure as a code bug — it's env-only.

## Files Modified
- README.md (added trailing marker line)

## Open Questions
- None

## Next Steps
- Commit README.md change.
