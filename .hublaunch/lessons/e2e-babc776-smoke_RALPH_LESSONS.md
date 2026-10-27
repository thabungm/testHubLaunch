# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed README marker line, typecheck passes
- Blockers: None

## Key Discoveries
- Disposable E2E smoke test: single-line append to README.md.
- Must run `npm install` before `npm run typecheck` (tsc not on PATH otherwise).
- Regression cmd `npm run test:contact` requires SLACK_URL + does a live Slack send; plan did NOT ask for it, only the README marker + git log check.

## Solutions That Worked
- Edited README.md to append `<!-- hula-e2e e2e-babc776-2341 e2e-babc776-smoke -->` as last line.
- Committed only README.md (ralph.md was pre-modified at session start; left out per plan requiring only README.md in the commit).

## Things to Avoid
- Don't commit ralph.md / lessons file into the PR commit — plan requires only README.md changed.

## Files Modified
- README.md (committed in 11f859b)

## Open Questions
- None

## Next Steps
- Done. Acceptance criteria met: README ends with marker; `git log -1 --stat` shows only README.md.
