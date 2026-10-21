# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended hula-e2e marker to README.md; typecheck passes
- Blockers: None

## Key Discoveries
- Disposable E2E smoke test. Single step: append marker comment to README.md.
- `npm install` is required before `npm run typecheck` (tsc not preinstalled).
- Regression test `npm run test:contact` performs a LIVE Slack send and needs
  the `SLACK_URL` secret, which is NOT present in this isolated container.
  It exits 1 with "FAIL: SLACK_URL not set" — this is an environment limitation,
  not a bug. The README-only change cannot affect this test anyway.

## Solutions That Worked
- Edit README.md to append `<!-- hula-e2e e2e-056d865-1740 e2e-056d865-smoke2 -->`
  as the final line (preceded by a blank line).
- `npm install` then `npm run typecheck` → passes with zero errors.

## Things to Avoid
- Don't treat the SLACK_URL-missing test failure as something to fix; it's
  expected without the secret.

## Files Modified
- README.md (appended one marker line)

## Open Questions
<!-- Things that need clarification or further investigation -->

## Next Steps
<!-- What should be done next -->
