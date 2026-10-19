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

## Regression Follow-up (2026-10-19)
- A regression run reported `npm run test:contact` failing with
  `FAIL: SLACK_URL not set — cannot run live test`.
- Investigated and determined this is NOT a regression caused by this branch:
  - `git diff main...hook-fail-test --stat` shows only
    `.hublaunch/hooks/beforeLaunch.ts`, the two lessons/plan markdown files, and
    `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md` changed. `scripts/contact.ts` and
    `scripts/test-contact.ts` are byte-identical to `main` and were last
    touched in the unrelated `be432f3` commit, which predates this branch.
  - `scripts/test-contact.ts` does a *live* Slack send and intentionally
    `process.exit(1)`s with that exact message whenever the `SLACK_URL`
    secret isn't present in the environment — this sandbox has no
    `SLACK_URL` set and no CI/workflow config wires one in, so the test
    fails the same way on `main` with zero code changes.
  - This matches the original lessons note above: "Do NOT run
    `npm run test:contact`... unrelated to this markdown-only fixture."
- No source change was made in response to this failure — doing so (e.g.
  faking a `SLACK_URL`, stubbing the live send, or editing `contact.ts`)
  would mask an unrelated pre-existing environmental limitation rather than
  fix anything this branch broke. Correct action: document and leave as-is.
