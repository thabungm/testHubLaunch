# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended hula-e2e marker to README.md, created .hublaunch/goals.md, verified checks.
- Blockers: None (test:contact fails only due to missing SLACK_URL secret — environmental, not a regression).

## Key Discoveries
- SHA7 for the marker is `be27653`, derived from the branch/tracking name `e2e-be27653-android`. Env vars `SHA7`/`RUN_ID` are unset in this sandbox, so the concrete value comes from the tracking name.
- README.md had no pre-existing `hula-e2e` marker; this was a pure append.
- `npm install` is required before `typecheck`/`build` (tsc not on PATH otherwise).
- `test:contact` performs a LIVE Slack send and requires `SLACK_URL`; it exits 1 with "FAIL: SLACK_URL not set" when the secret is absent (the case here). Neither README nor goals.md is read by any code path, so this failure is purely environmental.

## Solutions That Worked
- Append marker as exactly ONE line (no preceding blank line) so `git diff` shows a single insertion — matches the plan's acceptance criteria.
- `npm run typecheck` → exit 0; `npm run build` → exit 0.

## Things to Avoid
- Do NOT add a blank line before the marker — the plan requires exactly one added line.
- Do NOT fabricate a SLACK_URL to force test:contact to pass.
- Do NOT commit the literal `<SHA7>` or `${process.env.SHA7}` placeholder.

## Files Modified
- README.md: appended `<!-- hula-e2e e2e-be27653-android -->` at EOF (1 insertion).
- .hublaunch/goals.md: created (inferred project goals).

## Open Questions
- None.

## Next Steps
- None for this plan. PR to be closed unmerged by the server pipeline (lifecycle step, outside this change).
