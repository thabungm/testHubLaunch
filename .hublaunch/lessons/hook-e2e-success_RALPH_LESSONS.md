# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Wrote HOOK_TEST_MARKER.md from live process.env; typecheck passes.
- Blockers: None

## Key Discoveries
- Plan was a disposable E2E smoke test, not a feature: create one file `/workspace/HOOK_TEST_MARKER.md` with exactly 4 lines read live from this session's `process.env`.
- **Observed env values (the E2E result):**
  - `LAUNCH_TIMESTAMP set: false`
  - `HOOK_RAN_IN: unset`
  - `HOOK_SECRET_TEST set: true`
  - `RALPH_CONTAINER_MODE: true`
- This is a **MISMATCH** vs the expected sandbox outcome (expected: LAUNCH_TIMESTAMP set:true, HOOK_RAN_IN:sandbox, HOOK_SECRET_TEST set:false, RALPH_CONTAINER_MODE:true).
  - RALPH_CONTAINER_MODE=true (we ARE in sandbox) BUT the beforeLaunch hook's envVars/unsetEnvVars were NOT applied to this session: LAUNCH_TIMESTAMP absent, HOOK_RAN_IN absent, HOOK_SECRET_TEST still present.
  - Per the plan, this is a legitimate/informative test result — record reality, do NOT "fix" it.

## Solutions That Worked
- Used the plan's one-shot `node -e` snippet to derive+write all four lines, keeping the two guarded values (HOOK_SECRET_TEST, LAUNCH_TIMESTAMP) out of stdout — only presence reported.
- `npm install` was needed before `npm run typecheck` (tsc not found otherwise). Typecheck passes clean.

## Things to Avoid
- Do NOT hardcode planning-pass env values; must read live from implementation session.
- Do NOT emit values of HOOK_SECRET_TEST / LAUNCH_TIMESTAMP — presence only.

## Files Modified
- Created: /workspace/HOOK_TEST_MARKER.md (only file created by this task)

## Open Questions
- None for this task. The mismatch itself is the finding to report upstream (hula-server PR #759): sandbox-side beforeLaunch hook env mutations did not reach this session.

## Next Steps
- Done. Marker file is the deliverable.

## Regression Follow-up (2026-10-19)
- Reported regression failure: `npm run test:contact` → "FAIL: SLACK_URL not set — cannot run live test".
- **Root cause: missing secret, not a code regression.** Verified:
  - `git diff be432f3 HEAD -- scripts/contact.ts scripts/test-contact.ts` is empty — this
    branch's commits (HOOK_TEST_MARKER.md, ralph.md, lessons, plan files, beforeLaunch
    hook fixture) never touch `scripts/contact.ts` or `scripts/test-contact.ts`.
  - `SLACK_URL` is unset in this sandbox; no `.env` or `hublaunch.config.js` present
    anywhere under `/workspace` (both are gitignored and provisioned externally per-session).
  - This matches the prior `testContactUs_RALPH_LESSONS.md` finding from another sandbox
    run where SLACK_URL was also absent — vs. `stream-live-llm-verify_RALPH_LESSONS.md`
    where it *was* present. Availability is non-deterministic across sandbox sessions,
    controlled by HubLaunch's secret-forwarding, not by repo code.
  - The hook-e2e-success plan for this branch explicitly scoped out "Any change to
    `.env`, config files, or launch machinery" — consistent with not touching this.
- **Did not change `scripts/test-contact.ts` to skip-on-missing-SLACK_URL.** That would
  convert an intentional live Slack E2E check into a silent no-op, masking the real
  failure mode the test exists to catch. The hard-fail-with-clear-message behavior is
  correct and matches the project's documented intent in `ralph.md`.
- **Conclusion: not a regression introduced by this branch.** No code fix applied.
  `npm run test:contact` will pass once SLACK_URL is provisioned in the sandbox env.

## Regression Follow-up #2 (2026-10-19, re-run)
- Same failure reported again on a fresh regression pass: `npm run test:contact` →
  "FAIL: SLACK_URL not set — cannot run live test". Re-verified from scratch, same result:
  - `git diff main --stat` on this branch shows only 4 files changed: this lessons file,
    one plan file under `plans/`, `HOOK_TEST_MARKER.md`, and `ralph.md`. No script files
    touched at all — confirmed again `scripts/contact.ts` / `scripts/test-contact.ts` are
    untouched by this branch.
  - `SLACK_URL` is still empty in this sandbox session; no `.env` / `hublaunch.config.js`
    exist under `/workspace`.
  - No code change made (again) — doing so would require either hardcoding a secret
    (unsafe) or weakening `test-contact.ts` to skip when the secret is absent, which
    would mask the live-Slack-send failure mode it exists to catch.
- **This is environment flakiness in the regression harness, not a bug to fix in code.**
  If this keeps recurring across sessions, the actionable fix is upstream: either (a) the
  regression runner should provision `SLACK_URL` before invoking `test:contact`, or (b)
  `test:contact` should be excluded from automated regression runs and reserved for manual
  live-Slack verification. Flagging this for a human/upstream decision rather than
  silently patching the test.

## Regression Follow-up #3 (2026-10-19, re-run again)
- Third identical report: `npm run test:contact` → "FAIL: SLACK_URL not set — cannot run
  live test". Re-verified once more, same findings as #1 and #2:
  - `git diff main --stat` still shows only the same 4 non-code files on this branch
    (lessons, one plan file, `HOOK_TEST_MARKER.md`, `ralph.md`). `scripts/contact.ts` and
    `scripts/test-contact.ts` remain untouched.
  - `SLACK_URL` is still empty (`echo "SLACK_URL=[$SLACK_URL]"` → `SLACK_URL=[]`); no
    `.env`/`hublaunch.config.js` present under `/workspace`.
  - No code change applied, for the same reasons as #1/#2. This is the third consecutive
    confirmation that the failure is sandbox secret provisioning, not something this
    branch's code can fix. Treating further identical reports as the same known issue
    unless the diff or env state actually changes.
