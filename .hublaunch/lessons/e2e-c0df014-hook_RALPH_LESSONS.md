# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended E2E marker to README.md, typecheck passed
- Blockers: None

## Key Discoveries
- Plan is trivial/disposable: append exactly one line `<!-- hula-e2e e2e-c0df014-hook -->` to the end of README.md. Nothing else.
- README.md was 85 lines, ended with a trailing newline. Marker appended as new line 86.
- `tsc` not installed until `npm install` is run (tsc comes from devDependencies). Run `npm install` before `npm run typecheck`.

## Solutions That Worked
- `printf '<!-- hula-e2e e2e-c0df014-hook -->\n' >> README.md` — appends verbatim marker with trailing newline.
- `npm install && npm run typecheck` → EXIT 0, zero errors.

## Things to Avoid
- Do NOT run `npm run test:contact` — it performs a live Slack webhook send (needs SLACK_URL secret, outward-facing) and exercises no code touched by a README-only change.
- Do NOT create `.hublaunch/goals.md` or touch any other file — plan says "nothing else."

## Files Modified
- README.md (1 line added: the hula-e2e marker)

## Open Questions
- None

## Next Steps
- Done. Branch/PR is disposable and will be closed unmerged by the pipeline.

## Regression Check (2026-10-27)
- Reported failure: `npm run test:contact` → "FAIL: SLACK_URL not set — cannot run
  live test".
- Root cause: NOT a regression from this branch. `scripts/test-contact.ts` has
  always hard-required a real `SLACK_URL` secret to perform a live Slack webhook
  send (see its own exit-1 check), and this sandbox has no `SLACK_URL` set. This
  exact blocker was already documented in `testContactUs_RALPH_LESSONS.md` from
  the PR that introduced the contact feature, before this branch existed.
- Verified this branch's diff vs its parent touches only README.md (+1 marker
  line), this lessons file, and ralph.md/plan notes — `scripts/contact.ts` and
  `scripts/test-contact.ts` are untouched (`git diff d3608fd..HEAD --stat`).
- Fix: none applicable/needed — there is no code change to revert, and the test
  cannot pass without a live `SLACK_URL` secret injected by the pipeline. Not
  fixable from within the sandbox. `npm run typecheck` still passes (0 errors),
  confirming no code-level breakage.
