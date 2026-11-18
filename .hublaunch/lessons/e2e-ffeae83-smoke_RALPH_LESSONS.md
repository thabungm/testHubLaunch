# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed f3d7c38 "docs: append hula-e2e smoke marker to README" (README.md only, +1 line)
- Blockers: None

## Key Discoveries
- Plan = single-line append to README.md (disposable E2E smoke; PR is to be closed unmerged).
- README.md already ended with a trailing newline, so `printf '%s\n' '<marker>' >> README.md` appends cleanly.
- `ralph.md` had a pre-existing, harness-injected modification (adds `npm run build` to RALPH_BUILD_COMMANDS). Out of scope: NOT committed.
- No CONTRIBUTING.md / PR template in repo (.github/ only contains hula scripts).
- `npm run test:contact` exits 1 immediately when SLACK_URL is unset (no .env, no env var in sandbox). This is environmental, not caused by the change.
- `npx tsx -e` compiles as CJS and fails on contact.ts top-level await; use a temp `.mts` file instead.

## Solutions That Worked
- Offline validation check: write a temp `/tmp/x/check.mts` that imports `/workspace/scripts/contact.ts` and calls
  `validateContact` with bad input -> "PASS (validation): rejected 4 invalid fields".
- `npm install` then `npm run typecheck` and `npm run build` both exit 0.

## Things to Avoid
- Don't `git add -A` here: it would sweep in ralph.md and this lessons file, breaking the "only README.md changed" check.
- Don't use `tsx -e` for importing contact.ts (top-level await under CJS).

## Files Modified
- README.md (committed in f3d7c38)

## Open Questions
- None.

## Next Steps
- None. Harness handles push/PR.
