# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended marker line to README.md, typecheck passes, committed README.md only
- Blockers: None

## Key Discoveries
- Disposable E2E smoke test: single change = append one HTML comment marker to README.md.
- `tsc` is not present until `npm install` is run (devDependency). Run `npm install` before `npm run typecheck`.

## Solutions That Worked
- `npm install` then `npm run typecheck` → passes with zero errors.
- Committed only README.md to keep PR diff to the single feature file.

## Things to Avoid
- Don't commit ralph.md (pre-existing harness modification) or the lessons file into the feature PR.

## Files Modified
- README.md (appended marker line `<!-- hula-e2e e2e-8f06051-2354 e2e-8f06051-smoke -->`)

## Open Questions
- None

## Next Steps
- Done. Nothing remaining.
