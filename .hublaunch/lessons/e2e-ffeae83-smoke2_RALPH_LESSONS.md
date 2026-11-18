# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed 19a85c8 — appended marker line to README.md (only file in commit).
- Blockers: None

## Key Discoveries
- Plan is a disposable E2E smoke test: one-line append to README.md, close unmerged.
- README.md already ended with a trailing newline, so `printf '%s\n' ... >> README.md` appends cleanly.
- `ralph.md` was already modified (+1 line) in the working tree before this session started.
  It is NOT part of this plan, so it was deliberately left uncommitted (scope lock).
- No `.env` / `SLACK_URL` in the sandbox, so `npm run test:contact` exits 1 at its first
  guard ("SLACK_URL not set") before reaching the validation test. This is caused by the
  environment, not by the change.

## Solutions That Worked
- To run the no-network validation check alone, write a scratch `.mts` file (not `.ts`) in /tmp
  and run it with `npx tsx`. A `.ts` file outside the repo is compiled as CJS, and
  `scripts/contact.ts` uses top-level await, so the transform fails.
  Result: "PASS (validation): rejected 4 invalid fields".

## Things to Avoid
- Don't `git add -A`: it would sweep in the unrelated `ralph.md` change and this lessons file.

## Verification Results
- Acceptance: last line of README.md == marker: PASS
- `npm run typecheck`: exit 0
- `npm run build`: exit 0
- `npm run test:contact`: exit 1 (SLACK_URL unset, so the live Slack test could not run); validation portion run separately: PASS
- `git log -1 --stat`: only README.md (1 insertion)

## Files Modified
- README.md (committed)

## Open Questions
- None

## Next Steps
- None. Plan complete.
