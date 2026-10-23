# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended marker line to README.md, typecheck passes
- Blockers: None

## Key Discoveries
- Dependencies are not pre-installed; run `npm install` before `npm run typecheck` (otherwise `tsc: not found`).
- Only change required: append `<!-- hula-e2e e2e-3fcb0e4-1349 e2e-3fcb0e4-smoke -->` as the last line of README.md.

## Files Modified
- README.md (added marker line + preceding blank line)

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
