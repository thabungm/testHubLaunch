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

## Style Fix: AI-assistance disclosure (Co-Authored-By trailer)
- Rule `disclose-ai-assistance-in-commits-with-a-co-auth-1dm27vv`: commits on this branch should carry a `Co-Authored-By` trailer. Only 15fa590 had one; eb55121, 719004b and a7f5fd3 did not.
- Those commits are already pushed to origin/e2e-835d274-smoke. Adding trailers would need a rebase plus force-push, which rewrites shared history. I did NOT do that.
- What I did: committed this lessons update with the `Co-Authored-By` trailer. Any future commit on this branch must include the trailer.
- Open: if the gate requires the trailer on the three older commits, a human must approve the history rewrite (`git rebase` + `git push --force-with-lease`).
