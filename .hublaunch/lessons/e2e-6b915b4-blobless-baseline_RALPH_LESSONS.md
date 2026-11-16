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

### Attempt 2
- Re-checked `git log`: the attempt-1 commit a4b9c4e also lacked the trailer, contrary to the rule above. Existing commits (all pushed to origin) are still not rewritten, since that would need a force-push.
- Action: the attempt-2 commit ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Every agent-authored commit from now on must carry it, including fix commits.
- Only this lessons file changed.

### Attempt 3
- `git log -4` showed a4b9c4e (agent-authored, unpushed) still had no trailer. Reworded it locally with a non-interactive rebase, so it is now bb3ed55 and carries `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Only the two local unpushed fix commits were rewritten. Nothing on origin was touched and no force-push is needed.
- 0bc63c8 and 010dd32 are harness-generated and already on origin. They stay without the trailer, because amending them needs a force-push.
- This attempt's commit carries the trailer too. Only this lessons file changed.

## Open Questions
- None

## Next Steps
- None. Push and PR are handled by the HubLaunch harness.
