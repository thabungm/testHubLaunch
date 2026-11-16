# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed README.md marker line (commit "chore: add hula-e2e smoke marker to README")
- Blockers: None

## Key Discoveries
- Plan = append `<!-- hula-e2e e2e-835d274-1955 e2e-835d274-smoke -->` to README.md; acceptance requires last commit to touch ONLY README.md.
- `ralph.md` was already modified (adds `npm run build` to RALPH_BUILD_COMMANDS) before the session started — this is the harness's change, not part of the plan. It is left uncommitted on purpose.
- `npm run test:contact` exits 1 straight away when `SLACK_URL` is unset (the sandbox doesn't have it). The live Slack test can't run here.
- No CONTRIBUTING.md and no PR template. `.github/` only has hula scripts.

## Solutions That Worked
- `npm install`, then `npm run typecheck` (exit 0) and `npm run build` (exit 0).
- Offline validation check without SLACK_URL: import `validateContact` from a temp `.mts` file OUTSIDE the repo and run it with `npx tsx`. A `.ts` file outside the package is treated as CJS and fails on the top-level await in contact.ts.

## Things to Avoid
- Don't stage `ralph.md` or the lessons file in the plan commit (acceptance = only README.md changed).

## Files Modified
- README.md (one appended line)

## Open Questions
- None

## Next Steps
- None. Push and PR creation are left to the HubLaunch harness.
