# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended marker line to README.md, typecheck passes, committed.
- Blockers: None

## Key Discoveries
- Disposable E2E smoke test: single-line change to README.md.
- `npm install` is required before `npm run typecheck` (tsc is a devDependency).
- `npm run test:contact` requires `SLACK_URL` (live Slack send) — not set in this
  container, so it prints "FAIL: SLACK_URL not set" and exits 1. This is
  environmental and unrelated to the README-only change (no code touched).

## Solutions That Worked
- Edit README.md to append `<!-- hula-e2e e2e-2c26b63-1606 e2e-2c26b63-smoke -->`
  with a blank line before it.

## Things to Avoid
- Don't treat the SLACK_URL regression failure as a real regression — it's a
  missing-secret environment condition, not a code defect.

## Files Modified
- README.md (added marker line)

## Open Questions
- None.

## Next Steps
- Done. Acceptance criteria met: README ends with the marker line; only README.md changed.
