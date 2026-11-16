# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed 2968714 "docs: append hula-e2e marker to README" (only README.md changed)
- Blockers: None

## Key Discoveries
- Plan is a disposable E2E test: append one marker line to README.md. Close PR unmerged.
- `ralph.md` was already modified (adds `npm run build` to RALPH_BUILD_COMMANDS) before this session started. It is out of scope, so it was left uncommitted.
- No CONTRIBUTING.md and no PR template. `.github/` holds only `scripts/`.
- `npm run test:contact` exits 1 straight away with "SLACK_URL not set" because the sandbox has no webhook env var and no `.env`. That is an environment limit; it has nothing to do with this change. Repo rules forbid parsing `.env`.

## Solutions That Worked
- `printf '%s\n' '<marker>' >> README.md`. README already ended with a newline.
- Commit with `git add README.md` only, so `git log -1 --stat` shows a single file.

## Things to Avoid
- Don't check `$?` after a pipe to `tail`, because it reports tail's exit code. Redirect output and check the exit code directly.
- Don't commit `ralph.md` or this lessons file. Acceptance requires only README.md in the commit.

## Files Modified
- README.md (marker line appended, committed)

## Verification
- `npm run typecheck`: exit 0
- `npm run build`: exit 0
- `npm run test:contact`: exit 1 (SLACK_URL not set in sandbox; fails at the env check before any project code runs)

## Open Questions
- None

## Next Steps
- None. Push and PR are handled by the HubLaunch harness.
