# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Implemented formal greeting helper plan; typecheck + test:greeting both pass.
- Blockers: None

## Key Discoveries
- Project uses tsx-run standalone test scripts (assert + process.exit), no test framework.
- tsconfig uses allowImportingTsExtensions, so imports use explicit `.ts` specifiers.

## Solutions That Worked
- `npm install` needed first (node_modules absent in fresh container).
- `npm run typecheck` (tsc --noEmit) and `npm run test:greeting` both green.

## Things to Avoid
- Don't modify anything under scripts/ (out of scope per plan).

## Files Modified
- NEW src/greeting.ts — exports formalGreeting(name): string
- NEW src/greeting.test.ts — tsx assert-and-exit tests
- package.json — added "test:greeting" script
- tsconfig.json — include now covers src/**/*.ts

## Open Questions
- None

## Next Steps
- Done. All acceptance criteria met.
