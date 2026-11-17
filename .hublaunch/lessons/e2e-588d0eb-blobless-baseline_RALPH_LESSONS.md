# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended marker line to README.md; committed (README.md only, 1 insertion)
- Blockers: None (see note on test:contact below)

## Key Discoveries
- README.md already ended with a trailing newline, so `printf '%s\n' '<marker>' >> README.md` appends cleanly.
- `ralph.md` showed as modified (adds `npm run build` to RALPH_BUILD_COMMANDS) before the session started. That change came from the harness, not this plan, so it was left unstaged and out of the commit (scope lock).
- No CONTRIBUTING.md and no PR template; `.github/` only contains hula scripts.

## Solutions That Worked
- `npm run typecheck` -> exit 0; `npm run build` -> exit 0.
- `npm run test:contact` exits 1 immediately with "SLACK_URL not set" because the sandbox has no SLACK_URL or .env. The live Slack send can't run here. The validation-only half of the test was run on its own via a temp `.mts` script under /tmp and passed: "PASS (validation): rejected 4 invalid fields".

## Things to Avoid
- Don't put tsx temp scripts outside the repo with a `.ts` extension. They get treated as CJS, and contact.ts's top-level await then fails to transform. Use `.mts` instead.

## Files Modified
- README.md (marker line appended, committed)

## Open Questions
- None

## Next Steps
- None. Plan fully implemented.
