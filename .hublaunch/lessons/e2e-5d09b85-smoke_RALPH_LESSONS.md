# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended marker line to README.md, typecheck passes
- Blockers: None

## Key Discoveries
- Disposable E2E smoke test: just append one marker line to README.md.
- `tsc` is not present until `npm install` is run; after install `npm run typecheck` passes clean.
- Only README.md should be the feature change (ralph.md is harness-modified, lessons file is new/untracked).

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
