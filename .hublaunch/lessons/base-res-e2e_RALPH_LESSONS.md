# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Task: Add formatTimestamp utility function
- Blockers: None

## Key Discoveries
- Plan was straightforward: create single utility function
- TypeScript compiler needed `npm install` first
- Minimal change approach keeps risk low

## Solutions That Worked
- Created `scripts/format.ts` with single named export
- Used explicit type annotations (Date -> string)
- Leveraged native `Date.toISOString()` method
- Verified via `npm run typecheck` (passed with 0 errors)

## Things to Avoid
- Assumed tsc would be available without npm install
- No dependency issues or version conflicts

## Files Modified
- `scripts/format.ts` (NEW) - added formatTimestamp utility

## Open Questions
None - task complete

## Next Steps
None - task is 100% complete and tested
