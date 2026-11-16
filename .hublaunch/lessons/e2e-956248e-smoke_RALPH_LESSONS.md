# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed a2c367c ("test: append hula-e2e smoke marker to README") on branch e2e-956248e-smoke. Only README.md is in the commit.
- Blockers: None

## Key Discoveries
- The plan is a disposable E2E smoke test: append one marker line to README.md and change nothing else.
- `ralph.md` was already modified when the session started (the harness added `npm run build` to RALPH_BUILD_COMMANDS). It is NOT part of this change, so leave it out of the commit.
- `npm run test:contact` exits 1 right away when `SLACK_URL` is unset (as it is in the sandbox). That comes from the environment, not from the code.
- The validation-only check can still run without the network: put a temp `.mts` file outside the repo that imports `/workspace/scripts/contact.ts` and run it with `npx tsx`. Use `.mts`, not `.ts`: outside the package, tsx treats `.ts` as CJS and fails on contact.ts's top-level await. `tsx -e` also failed.

## Solutions That Worked
- `printf '%s\n' '<marker>' >> README.md` (README already ended in a newline).
- `git add README.md` only, then commit. `git log -1 --stat` shows only README.md.

## Things to Avoid
- Don't use `git add -A`, which would sweep in ralph.md and this lessons file.

## Files Modified
- README.md (marker line appended, committed)

## Verification Results
- npm run typecheck: PASS (exit 0)
- npm run build: PASS (exit 0)
- npm run test:contact: could not run the live part (SLACK_URL not set). The validation-only check was run separately: PASS (rejected 4 invalid fields)

## Open Questions
- None

## Next Steps
- None. Per the plan, the PR should be closed unmerged after the E2E run.
