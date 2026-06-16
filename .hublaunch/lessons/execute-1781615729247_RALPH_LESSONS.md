# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Wrote diagnose skill output to `.hublaunch/lessons/2026-06-16T13:17-diagnose_SKILL_OUTPUT.md`
- Blockers: None (task is a no-op by nature — see below)

## Key Discoveries
- The "plan" for this run is the generic `diagnose` skill — a debugging *methodology*, not a concrete task.
- GitHub issue #27 contains ONLY the verbatim skill text. There is NO reported bug, symptom, stack trace, or repro.
- This repo (`testHubLaunch`) is a HubLaunch SCAFFOLD ONLY. There is NO application code:
  - No `package.json` → `pnpm tsc --noEmit` and `pnpm check` both abort with `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`.
  - No `src/`, no IVR system (`src/dev-tools/ivr-simulator/` does not exist), no tests.
  - Git history adds only *plans* (landing/contact/about pages), never implementation.
- The `diagnose` skill requires (1) a concrete bug and (2) a runnable project to build a feedback loop. Neither exists.

## Solutions That Worked
- Correct move: apply the diagnose discipline through Phase 1, then STOP honestly per the skill's own
  "When you genuinely cannot build a loop: stop and say so explicitly" guidance.
- Do NOT fabricate a bug or invent speculative code changes just to have something to "fix".

## Things to Avoid
- Don't run `pnpm` verification gates as if they'll pass — there's no manifest; document the result honestly instead.
- Don't treat the ralph.md IVR/tsc/check requirements as failures to "fix"; they target an app that isn't in this repo.

## Files Modified
- `.hublaunch/lessons/2026-06-16T13:17-diagnose_SKILL_OUTPUT.md` (created — the required skill output)
- `.hublaunch/lessons/execute-1781615729247_RALPH_LESSONS.md` (this file)

## Open Questions
- None blocking. If a real bug + runnable project are later provided, the diagnose loop can run as designed.

## Next Steps
- None. Output file is written and ready for the automated commit step.
