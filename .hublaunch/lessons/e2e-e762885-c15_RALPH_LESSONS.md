# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed b53868a ("docs: append hula-e2e marker to README"), which changes only README.md
- Blockers: None

## Key Discoveries
- Plan = append a single marker line to README.md. Nothing else is in scope.
- `ralph.md` already had an uncommitted change (adds `npm run build` to RALPH_BUILD_COMMANDS) when the session started. It is harness-owned, so leave it out of commits.
- No CONTRIBUTING.md, PR template, or DCO requirement in the repo (.github/ only holds hula scripts).
- `SLACK_URL` is NOT set in the sandbox, so `npm run test:contact` exits 1 at its first guard ("SLACK_URL not set"). This is an environment issue and has nothing to do with the README change.

## Solutions That Worked
- Running the offline validation half of test-contact by itself: write a temp `.mts` file in /tmp that imports `/workspace/scripts/contact.ts` and run it with `npx tsx`. Result: PASS (rejected 4 fields).
  - A `.ts` temp file outside the repo fails because tsx treats it as CJS and contact.ts uses top-level await. Use `.mts`.

## Things to Avoid
- Don't commit ralph.md or this lessons file. The acceptance check needs `git log -1 --stat` to show only README.md.

## Files Modified
- README.md (appended `<!-- hula-e2e e2e-e762885-2232 e2e-e762885-c15 -->`)

## Verification Results
- `npm run typecheck`: pass (exit 0)
- `npm run build`: pass (exit 0)
- `npm run test:contact`: FAIL, SLACK_URL not set in sandbox (environmental)
- Offline validation check: pass

## Open Questions
- None

## Next Steps
- None. Push/PR is handled by the harness.
