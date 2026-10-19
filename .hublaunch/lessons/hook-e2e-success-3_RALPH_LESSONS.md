# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✅
- Last action: Wrote HOOK_TEST_MARKER.md from live env, verified, typecheck passes
- Blockers: None

## Key Discoveries
- The `beforeLaunch` sandbox hook DID run for the execution session. Live env observed:
  - `LAUNCH_TIMESTAMP set: true`
  - `HOOK_RAN_IN: sandbox`
  - `HOOK_SECRET_TEST set: false` (unset by hook — secrecy proof)
  - `RALPH_CONTAINER_MODE: true`
- This differs from the planning-phase snapshot (which showed LAUNCH_TIMESTAMP=false, HOOK_RAN_IN=unset, HOOK_SECRET_TEST=true). Confirms the plan's assumption: hook env mutations only apply to the plan-execution session, so env MUST be read live at execution time.

## Solutions That Worked
- Single `node -e` command computing booleans (`process.env[k]!==undefined`) for the two secret-protected vars and verbatim values for the others, then writing the file. This never materializes the secret values. Expression:
  `const b=(k)=>process.env[k]!==undefined?"true":"false"; const v=(k)=>process.env[k]!==undefined?process.env[k]:"unset";`

## Things to Avoid
- Do NOT `printenv HOOK_SECRET_TEST` / `LAUNCH_TIMESTAMP` — would leak values. Only emit set-ness.
- Do NOT copy planning-phase env snapshot; it differs from execution.

## Files Modified
- Created `/workspace/HOOK_TEST_MARKER.md` (4 lines, the only new file for this task).

## Open Questions
- None.

## Next Steps
- Done. `git status` shows only HOOK_TEST_MARKER.md added (plus pre-existing ralph.md mod and this lessons file). Commit/PR handled by launch pipeline.
