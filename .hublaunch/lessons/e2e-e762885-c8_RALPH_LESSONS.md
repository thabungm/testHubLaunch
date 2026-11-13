# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed ec23b01 "chore: append hula-e2e marker to README" (README.md only, +1 line)
- Blockers: None. (Live Slack test can't run in the sandbox: SLACK_URL isn't set. This is environmental.)

## Key Discoveries
- Plan = disposable E2E test: append `<!-- hula-e2e e2e-e762885-2232 e2e-e762885-c8 -->` to README.md. Close unmerged.
- No CONTRIBUTING.md and no PR template in the repo (.github/ only has scripts/). No DCO required.
- README.md already ended with a trailing newline, so `printf '%s\n' ... >> README.md` appends cleanly.
- `ralph.md` showed as modified (+1 line) at session start. The harness made that change, not the plan. Do NOT commit it.
- `npm run test:contact` exits 1 immediately when SLACK_URL is unset (scripts/test-contact.ts:9), before the
  offline validation test runs. No .env is present in the sandbox.

## Solutions That Worked
- To run the offline validation test without SLACK_URL, put a scratch script OUTSIDE the repo that imports
  `/workspace/scripts/contact.ts` and calls `validateContact(...)`. It must use the `.mts` extension: a `.ts` file
  in /tmp gets compiled as CJS, and contact.ts uses top-level await, so that fails.
  Result: "PASS (validation): rejected 4 invalid fields".

## Things to Avoid
- Don't stage `ralph.md` or this lessons file into the PR commit. The plan's check requires that only README.md changed.
- Don't set a fake SLACK_URL to "make the test pass". It would just attempt a network call to a bogus URL.

## Files Modified
- README.md (committed in ec23b01)

## Verification Results
- npm run typecheck: PASS (exit 0)
- npm run build: PASS (exit 0)
- npm run test:contact: FAIL (exit 1): "SLACK_URL not set". Environmental, unrelated to the README-only change.
- Offline validation check (standalone .mts): PASS
- Acceptance: README.md ends with the marker line ✓
- Manual check: `git log -1 --stat` shows only README.md ✓

## Open Questions
- None.

## Next Steps
- None. Plan fully implemented. Branch is ready for the HubLaunch PR step (not pushed by agent).
