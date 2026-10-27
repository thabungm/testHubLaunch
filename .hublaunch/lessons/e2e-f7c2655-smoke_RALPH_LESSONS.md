# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended marker line to README.md, verified typecheck + build pass
- Blockers: None

## Key Discoveries
- Disposable E2E smoke test: single-line doc change to README.md.
- `tsc` is not on PATH until `npm install` is run (installs devDeps).
- `npm run test:contact` performs a LIVE Slack send requiring SLACK_URL — skipped
  since this is a doc-only change and should not post to an external service.

## Solutions That Worked
- `npm install` then `npm run typecheck` → passes clean.
- `npm run build` → passes (runs scripts/build.mjs).

## Things to Avoid
- Don't run the live Slack regression for an unrelated doc-only change.

## Files Modified
- README.md (appended `<!-- hula-e2e e2e-f7c2655-0030 e2e-f7c2655-smoke -->`)
- ralph.md change was pre-existing (harness-managed, not mine).

## Next Steps
- Done. Acceptance criteria met.
