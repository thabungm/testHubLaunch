# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended hula-e2e marker to README.md, committed (f294bd9)
- Blockers: None

## Key Discoveries
- Disposable E2E smoke test: single step — append marker line to README.md.
- `tsc` not on PATH initially; `npm install` installs the 6 devDeps incl. typescript/tsx.
- Regression test `npm run test:contact` requires a live SLACK_URL webhook, which is
  NOT provisioned in this container (no env var, no .env). This is environmental and
  unrelated to the README-only change. It prints "FAIL: SLACK_URL not set".

## Solutions That Worked
- Edit README to add `<!-- hula-e2e e2e-3fcb0e4-1349 e2e-3fcb0e4-smoke2 -->` as last line.
- `npm run typecheck` → passes. `npm run build` → passes.

## Things to Avoid
- Don't treat the SLACK_URL live-test failure as a code bug; it's a missing secret.

## Files Modified
- README.md (added marker line)

## Open Questions
- None

## Next Steps
- Done. Ready for PR.
