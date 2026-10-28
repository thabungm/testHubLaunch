# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended marker line to README.md; verified typecheck passes.
- Blockers: None

## Key Discoveries
- Disposable E2E smoke test: only task is appending one marker comment to README.md.
- `tsc` is not on PATH until `npm install` is run (installs typescript devDep).
- The regression test `npm run test:contact` requires SLACK_URL (a live Slack webhook).
  It is NOT set in this sandbox and there is no .env, so the test exits 1 early.
  This is an environment limitation unrelated to the README-only change.

## Solutions That Worked
- `npm install` then `npm run typecheck` → passes with zero errors.

## Things to Avoid
- Don't treat the SLACK_URL regression failure as a bug in the change; it's purely
  a missing-secret environment constraint. The change touches no code.

## Files Modified
- README.md (added `<!-- hula-e2e e2e-f7c2655-0030 e2e-f7c2655-smoke2 -->` at end)

## Open Questions
- None.

## Next Steps
- Done. PR/commit handled by HubLaunch infra.
