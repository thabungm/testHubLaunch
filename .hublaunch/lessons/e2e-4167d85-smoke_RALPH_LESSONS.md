# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed README marker line (commit ad72c8c), verified only README.md changed.
- Blockers: None

## Key Discoveries
- Disposable E2E smoke test: single change = append marker line to README.md.
- `tsc` not on PATH until `npm install` runs — install dev deps first.
- `npm run test:contact` (regression) does a LIVE Slack send and requires `SLACK_URL`.
  Not provisioned in this sandbox, so it exits 1 with "SLACK_URL not set". This is an
  environmental limitation, NOT a code failure — the README-only change cannot affect it.

## Solutions That Worked
- Appended `<!-- hula-e2e e2e-4167d85-2032 e2e-4167d85-smoke -->` to end of README.md.
- `npm install` then `npm run typecheck` → passes with zero errors.
- Committed ONLY README.md (ralph.md was pre-modified before session; excluded per plan).

## Things to Avoid
- Don't commit ralph.md — it was pre-modified and plan requires only README.md to change.

## Files Modified
- README.md (added marker line + preceding blank line)

## Open Questions
- None.

## Next Steps
- Done. Plan 100% complete; acceptance criteria satisfied.
