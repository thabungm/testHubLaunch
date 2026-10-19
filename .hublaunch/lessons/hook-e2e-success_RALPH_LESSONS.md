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
