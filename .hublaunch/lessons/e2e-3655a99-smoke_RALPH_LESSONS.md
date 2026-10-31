# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: Complete
- Last action: Appended marker line to README.md, typecheck passed, committed
- Blockers: None

## Key Discoveries
- Disposable E2E smoke test: single change = append marker comment to README.md.
- `npm run typecheck` requires `npm install` first (tsc is a devDependency).
- Regression `npm run test:contact` does a LIVE Slack send needing SLACK_URL; out of scope for this marker-only change.

## Key Discoveries
<!-- Add important findings here as you work -->

## Solutions That Worked
<!-- Record successful fixes so they can be reused -->

## Things to Avoid
<!-- Record approaches that failed or caused issues -->

## Files Modified
<!-- Track which files you've changed -->

## Open Questions
<!-- Things that need clarification or further investigation -->

## Next Steps
<!-- What should be done next -->
