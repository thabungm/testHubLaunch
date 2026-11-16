# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed 700315f "chore: append hula-e2e marker to README (e2e-38e0a02-s4)"
- Blockers: None

## Key Discoveries
- Plan is a disposable E2E test: single README.md marker line; AC2 requires that only README.md + the plan file differ from main.
- `ralph.md` shows as modified in the working tree at session start — NOT ours; deliberately left uncommitted (would violate AC2).
- This lessons file is untracked; keep it uncommitted for the same reason.
- No SLACK_URL in the sandbox (no env var, no .env), so `npm run test:contact` fails at its SLACK_URL precondition (exit 1) — environment limitation, unrelated to a README-only change.
- No CONTRIBUTING.md / PR template / DCO in repo; .github/ only holds hula-* scripts.

## Solutions That Worked
- Appended marker with `printf '...\n' >> README.md` (README already ended with a newline).
- Verified the regression suite offline by pointing SLACK_URL at a throwaway local Node HTTP stub (in /tmp, returns 200 "ok"): PASS live send, PASS validation (4 issues), ALL PASS. No real Slack message sent.
- `npm run typecheck` and `npm run build` both exit 0.

## Things to Avoid
- `pkill -f <path>` inside the same bash -c command matches the shell itself (exit 144) — harmless but noisy; kill by captured PID instead.
- Do not commit ralph.md or this lessons file (AC2).

## Files Modified
- README.md (committed)

## Open Questions
- None.

## Next Steps
- None — plan complete. Branch is disposable; close unmerged per plan.
