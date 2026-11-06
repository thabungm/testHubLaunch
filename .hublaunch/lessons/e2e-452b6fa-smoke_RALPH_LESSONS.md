# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: Complete
- Last action: Appended marker line to README.md, typecheck passes, committed
- Blockers: None

## Key Discoveries
- Disposable E2E smoke test: single change = append marker line to README.md.
- `npm install` is required before typecheck (`tsc` comes from devDependency `typescript`).
- `npm run test:contact` does a LIVE Slack send and needs `SLACK_URL`; it is unset
  in this container, so it prints "FAIL: SLACK_URL not set" — environmental, not a
  regression (README marker cannot affect test behavior).

## Solutions That Worked
- Edit README.md to add `<!-- hula-e2e e2e-452b6fa-1605 e2e-452b6fa-smoke -->` as last line.

## Things to Avoid
- Don't commit ralph.md (pre-existing working-tree change, out of scope).

## Files Modified
- README.md (added trailing marker line)

## Open Questions
<!-- Things that need clarification or further investigation -->

## Next Steps
<!-- What should be done next -->
