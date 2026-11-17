# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended the marker line to README.md and committed it (README.md is the only file in the commit)
- Blockers: None (the live Slack test can't run because SLACK_URL isn't set; see below)

## Key Discoveries
- The plan is a disposable E2E smoke test: append one marker line to README.md.
- README.md already ended with a trailing newline, so `printf '%s\n' '<marker>' >> README.md` appends cleanly.
- `ralph.md` had an uncommitted change before this session started (it adds `npm run build` to RALPH_BUILD_COMMANDS). It belongs to the harness, not to this plan. Do NOT commit it.
- `npm run test:contact` exits 1 straight away when SLACK_URL isn't set, and its validation-only test sits after that gate.
- To run the validation check by itself, use an `.mts` script outside the repo that imports `/workspace/scripts/contact.ts`. A `.ts` file in /tmp is compiled as CommonJS and fails on contact.ts's top-level await.

## Solutions That Worked
- `npx tsx /tmp/hl-check/validate.mts` → "PASS (validation): rejected 4 invalid fields"
- `npm run typecheck` → exit 0; `npm run build` → exit 0 and leaves the working tree unchanged

## Things to Avoid
- Don't stage `ralph.md` or `.hublaunch/` files in the PR commit; the plan requires that only README.md changes.
- Don't run a `.ts` (CJS) harness script from /tmp against contact.ts; use `.mts`.

## Files Modified
- README.md (one marker line appended at the end)

## Open Questions
- None.

## Next Steps
- None. Plan complete.
