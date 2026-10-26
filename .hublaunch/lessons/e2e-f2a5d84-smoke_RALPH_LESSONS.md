# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended marker line to README.md, ran typecheck (passes)
- Blockers: None (regression test requires live SLACK_URL, unavailable in sandbox)

## Key Discoveries
- This is a disposable E2E smoke test. Only task: append one marker line to README.md.
- `node_modules` not present initially; `npm install` needed before `npm run typecheck`.
- Regression `npm run test:contact` requires a live `SLACK_URL` webhook secret, which is NOT set in this isolated container, so it exits 1 with "FAIL: SLACK_URL not set". This is an environmental prerequisite, not a code defect — the change touches only README.md.

## Solutions That Worked
- Appended `<!-- hula-e2e e2e-f2a5d84-2225 e2e-f2a5d84-smoke -->` as the final line of README.md.
- `npm install` then `npm run typecheck` → passes with zero errors.

## Things to Avoid
- Don't expect test:contact to pass without SLACK_URL; it is a live-send test.

## Files Modified
- README.md (added marker line + preceding blank line)

## Open Questions
- None.

## Next Steps
- Done. Feature diff is the single README.md marker line.
