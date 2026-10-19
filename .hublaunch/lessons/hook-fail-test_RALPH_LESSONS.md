# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created fallback marker file `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md`
- Blockers: None

## Key Discoveries
- This is an E2E test of HubLaunch's sandbox-side `beforeLaunch` hook FAILURE path.
- Expected (passing) outcome: the `hook-fail-test` branch's `beforeLaunch.ts` exits 1
  and aborts the launch BEFORE any agent work. In that case the task body never runs
  and the tree stays clean (empty diff = pass).
- Because the task body WAS reached in this session, the hook did NOT abort the run.
  Per the plan, that is itself the failure signal, and the defined fallback is to create
  exactly one marker file so the bypass is observable.
- `tsc` is not on PATH until `npm install` runs; typecheck passes cleanly after install.

## Solutions That Worked
- Created `/workspace/HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md` containing the single line
  `the beforeLaunch hook did not abort this run` (one trailing LF newline).
- Verified: file exists, contents exact, `git status --porcelain` shows exactly one
  added path (plus this lessons infra file). `npm run typecheck` passes (zero errors).

## Things to Avoid
- Do NOT touch `.hublaunch/hooks/beforeLaunch.ts` — it is the component under test.
- Do NOT run `npm run test:contact` — it performs a live Slack send (needs SLACK_URL)
  and is unrelated to this markdown-only fixture; the plan scopes out all verification
  beyond creating the file.
- Do NOT add/modify/delete any file other than the single marker.

## Files Modified
- Added: `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md` (repo root) — the fallback marker.

## Open Questions
- None.

## Next Steps
- None. Plan is fully implemented and verified.
