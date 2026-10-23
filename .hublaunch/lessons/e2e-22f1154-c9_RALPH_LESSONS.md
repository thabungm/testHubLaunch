# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✅
- Last action: Committed README marker line, typecheck passing
- Blockers: None

## Key Discoveries
- Disposable E2E test plan — only requires appending one marker line to README.md.
- `npm install` is required before `npm run typecheck` (tsc is a devDependency, not global).
- Regression test `npm run test:contact` does a LIVE Slack send and needs `SLACK_URL`
  secret, which is NOT set in this container. It fails fast with
  "FAIL: SLACK_URL not set" — this is an environment limitation, unrelated to the
  README-only change.

## Solutions That Worked
- Appended `<!-- hula-e2e e2e-22f1154-1718 e2e-22f1154-c9 -->` to end of README.md.
- Committed ONLY README.md so the PR diff matches the manual checklist
  (expects only README.md changed). ralph.md + lessons file left out of the commit.

## Things to Avoid
- Don't try to run the live Slack regression without SLACK_URL — it will always fail.

## Files Modified
- README.md (added marker line) — committed as ddef02b

## Open Questions
- None.

## Next Steps
- Done. Plan 100% complete; acceptance criteria met.
