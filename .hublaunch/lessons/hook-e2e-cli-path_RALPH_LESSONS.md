# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created CLI_PATH_MARKER.md, typecheck passes
- Blockers: None

## Key Discoveries
- Plan is a disposable E2E smoke test for hula-server PR #759 (CLI launch path should NOT re-run beforeLaunch hook in sandbox).
- The actual task is trivial: create one marker file. Assertion happens on the sandbox log (checking no "BEFORE-LAUNCH HOOK" section), not on this repo's code.
- `tsc` is not on PATH until `npm install` is run (devDependency: typescript).

## Solutions That Worked
- `npm install` then `npm run typecheck` → passes with zero errors.

## Things to Avoid
- Do NOT modify any file other than CLI_PATH_MARKER.md (plan explicitly says so).

## Files Modified
- CLI_PATH_MARKER.md (new, single line: "cli path")

## Open Questions
- None

## Next Steps
- None — plan complete.
