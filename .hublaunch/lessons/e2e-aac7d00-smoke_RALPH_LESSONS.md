# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed README marker line; typecheck passes.
- Blockers: None (see note on test:contact below)

## Key Discoveries
- Disposable E2E smoke test: single step = append `<!-- hula-e2e e2e-aac7d00-2023 e2e-aac7d00-smoke -->` to README.md.
- `tsc` is not on PATH until `npm install` is run. Run `npm install` first.
- `npm run test:contact` requires the `SLACK_URL` secret and does a LIVE Slack send.
  In this isolated container SLACK_URL is unset, so the test exits 1 with
  "FAIL: SLACK_URL not set". This is an ENVIRONMENT limitation, NOT a bug — the
  README marker change cannot affect code behavior.

## Solutions That Worked
- `npm install` → `npm run typecheck` (tsc --noEmit) passes with EXIT=0.
- Edit README.md to append marker as the final line.

## Things to Avoid
- Don't treat the test:contact SLACK_URL failure as a code defect; it's a missing secret.

## Files Modified
- README.md (appended one marker comment line)

## Next Steps
- None. Plan complete. Change committed (commit 9ec9fc8).
