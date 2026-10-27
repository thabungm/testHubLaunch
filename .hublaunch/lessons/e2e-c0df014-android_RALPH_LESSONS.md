# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Investigated reported regression (`test:contact` failing with "SLACK_URL not set"), confirmed it is a pre-existing, unrelated, by-design environment gap — not caused by this change. No code fix applied.
- Blockers: None

## Regression Investigation (post-hoc)
- Reported failure: `npm run test:contact` → `FAIL: SLACK_URL not set — cannot run live test`.
- `git diff 1f7c47c fdd05aa -- scripts/ package.json` is empty — this change never touched `scripts/contact.ts`, `scripts/test-contact.ts`, or `package.json`. The only diff is the README.md marker + this lessons file.
- Root cause: this sandbox has no `.env` / `SLACK_URL` in the environment. Per the original feature plan (`.hublaunch/plans/2026-07-14-17:30-contact-us-slack-feature.md`), this is intentional:
  - "Out of Scope: CI wiring for the test (it is run manually / in the HubLaunch container)."
  - FR6 "Guard: if `SLACK_URL` is unset/empty, print `FAIL: SLACK_URL not set — cannot run live test` and `process.exit(1)`."
  - The live test is explicitly designed to hard-fail without a real webhook — faking/softening that guard would violate the feature's explicit intent ("Do NOT mock the Slack call in the happy-path test — the requirement is a real send").
- `npm run typecheck` passes clean. No other regression surfaced.
- Decision: did NOT modify `scripts/contact.ts` / `scripts/test-contact.ts`. Changing the guard to skip-on-missing-SLACK_URL would silently defeat the live E2E test's purpose for everyone, just to make an unrelated README-only PR's regression check green. This failure predates and is independent of this change.

## Key Discoveries
- This repo (test-hub-launch-contact) is a disposable HubLaunch E2E target. The PR from this change is expected to be closed unmerged.
- The marker is an inert HTML/Markdown comment — invisible when rendered, zero code impact.
- Dependencies are not pre-installed; `tsc` requires `npm install` first (adds 6 packages, no package-lock change tracked).

## Solutions That Worked
- Single Edit to README.md: appended one blank line + `<!-- hula-e2e e2e-c0df014-android -->` after the final `## Notes` bullet (was line 85, marker now line 87). File ends with exactly one trailing newline (verified via `od -c`).
- Verification: `grep -n "hula-e2e e2e-c0df014-android" README.md` → single match; `git diff --stat` → README.md only, 2 insertions, 0 deletions; `npm run typecheck` → clean.

## Things to Avoid
- Do NOT create `.hublaunch/goals.md` or any other file — plan scope is "Nothing else." Only README.md is touched.

## Files Modified
- README.md (appended marker line)

## Open Questions
- None.

## Next Steps
- Done. Plan is 100% complete. PR to be closed unmerged per plan.
- If `test:contact` keeps getting flagged as a "regression" in automated runs, the real fix belongs to the regression harness config (exclude `test:contact` when `SLACK_URL` isn't provisioned), not to this feature's code.
