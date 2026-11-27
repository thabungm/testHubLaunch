# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed 69dd646 "chore: add hula-e2e smoke marker to README" (README.md only, +1 line)
- Blockers: None for the plan. Live Slack regression test cannot run in sandbox (SLACK_URL unset).

## Key Discoveries
- Plan is a disposable E2E smoke test: append one marker line to README.md, nothing else.
- No CONTRIBUTING.md, no PR template, no DCO sign-off in history. Commits use conventional-commit prefixes.
- `ralph.md` had a pre-existing uncommitted change (adds `npm run build` to RALPH_BUILD_COMMANDS). It is NOT ours, so it was left out of the commit to keep scope locked to README.md.
- `npm run test:contact` exits 1 straight away when SLACK_URL is unset (scripts/test-contact.ts:9), before the validation check runs. Sandbox has no SLACK_URL and no .env.
- `npx tsx -e '...'` importing scripts/contact.ts fails: tsx -e compiles to CJS, and contact.ts uses top-level await (its main guard).

## Solutions That Worked
- Append the line with `printf '%s\n' '<marker>' >> README.md` (README already ended with a newline).
- Validation-only check without network: write an ESM file at /tmp/hl-check/validate.mts that imports
  "/workspace/scripts/contact.ts", then run `npx tsx /tmp/hl-check/validate.mts`. Result: PASS (4 invalid fields rejected).

## Things to Avoid
- Don't commit ralph.md or this lessons file in the PR (manual check expects only README.md changed).
- Don't use `tsx -e` to import contact.ts (CJS/top-level-await error).

## Files Modified
- README.md (appended marker line), committed in 69dd646

## Verification Results
- npm run typecheck: PASS (exit 0)
- npm run build: PASS (exit 0)
- npm run test:contact: FAIL "SLACK_URL not set" (environmental, unrelated to the README change)
- Validation-only check (no network): PASS
- git log -1 --stat: only README.md changed

## Open Questions
- None.

## Next Steps
- None. Plan complete.
