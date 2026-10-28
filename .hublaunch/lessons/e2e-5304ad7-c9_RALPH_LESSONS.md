# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: Complete
- Last action: Appended marker to README.md, typecheck passed, committed
- Blockers: None

## Key Discoveries
- `tsc` is not installed by default; must run `npm install` (adds 6 packages) before `npm run typecheck`.
- `ralph.md` was already modified (M) at session start — a pre-existing harness artifact, NOT part of this plan. Left untouched.

## Solutions That Worked
- `printf '<!-- e2e-5304ad7-c9 marker -->\n' >> README.md` — append-only, preserves all existing bytes incl. the em dash.
- `npm install && npm run typecheck` — passes with zero errors.

## Things to Avoid
- Don't stage ralph.md or any file other than README.md.

## Files Modified
- README.md (one line appended: the e2e marker comment)

## Open Questions
- None

## Next Steps
- Done — plan 100% complete.
