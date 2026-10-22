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

## Regression Check (2026-10-22)
- Reported failure: `npm run test:contact` → "FAIL: SLACK_URL not set — cannot run live test".
- Root cause: NOT caused by the greeting change. `scripts/test-contact.ts` is byte-identical
  to the version from the original Contact-Us feature commit (`be432f3`); it performs a
  **live** Slack webhook send and is documented (README) to fail with exit 1 whenever
  `SLACK_URL` is unset. This sandbox simply doesn't have that secret forwarded.
  Our commit only touched `tsconfig.json` (`include` += `src/**/*.ts`), added
  `src/greeting.ts`/`src/greeting.test.ts`, and added the `test:greeting` npm script —
  none of which affect `scripts/contact.ts` or `scripts/test-contact.ts`.
- Verified `npm run typecheck` and `npm run test:greeting` both pass cleanly.
- Action taken: none to scripts/ (confirmed still out of scope). Did not stub/skip the
  live Slack test just to force a pass — that would defeat its purpose as a live
  integration check. If this needs to go green in CI, the fix is to provision
  `SLACK_URL` in the environment, not to change the code.
