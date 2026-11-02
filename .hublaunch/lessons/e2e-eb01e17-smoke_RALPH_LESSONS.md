# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed README marker line (commit 1b43e96)
- Blockers: None

## Key Discoveries
- Disposable E2E smoke test. Only change required: append marker line to README.md.
- `tsc` is not on PATH until `npm install` runs (installs tsx/typescript devDeps).
- `npm run test:contact` requires a live `SLACK_URL` webhook; it is NOT set in this
  sandbox, so the live test prints "FAIL: SLACK_URL not set" and exits 1. This is an
  environment limitation, not a code defect — the README-only change can't affect it.

## Solutions That Worked
- Appended `<!-- hula-e2e e2e-eb01e17-2022 e2e-eb01e17-smoke -->` to end of README.md.
- `npm install` then `npm run typecheck` → passes with zero errors.

## Things to Avoid
- Don't commit `ralph.md` (pre-existing infra edit) or the lessons file — keep PR
  scope to README.md only, per the manual testing checklist.

## Files Modified
- README.md (added trailing marker line) — committed.

## Open Questions
- None.

## Next Steps
- None. Plan complete; acceptance criteria met.
