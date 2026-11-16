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

## Style Fix (commit-messages-carry-ai-assistance-attribution)
- Flagged: only 2968714 carries a Co-Authored-By trailer; harness-generated commits (0e5f6c6, 0bc63c8, 010dd32) have none.
- Action: no history rewrite. Those commits are already pushed to origin/e2e-6b915b4-blobless-baseline and are harness-owned, so amending them would need a force-push. Any commit made by the agent from here on ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- No source files changed for this fix.

## Open Questions
- None

## Next Steps
- None. Push and PR are handled by the HubLaunch harness.
