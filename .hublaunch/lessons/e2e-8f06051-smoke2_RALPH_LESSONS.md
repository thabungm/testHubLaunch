# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended marker line to README.md, typecheck passed
- Blockers: None

## Key Discoveries
- Disposable e2e smoke test: single change = append one marker comment to README.md.
- `npm install` is required before typecheck (tsc lives in devDependencies).
- Regression command `npm run test:contact` needs SLACK_URL (live Slack send); not set
  in this sandbox. README-only change touches no code path it tests, so skipped safely.

## Solutions That Worked
- `npm install` then `npm run typecheck` → passes with zero errors.

## Things to Avoid
- Don't include the lessons file in the PR content commit — acceptance requires
  README.md to be the only changed file.

## Files Modified
- README.md (appended marker line `<!-- hula-e2e e2e-8f06051-2354 e2e-8f06051-smoke2 -->`)

## Open Questions
- None

## Next Steps
- Done.
