# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended e2e marker line to README.md and committed (README.md only).
- Blockers: None

## Key Discoveries
- Plan is a disposable E2E smoke test: single-line append to README.md.
- README.md already ended with a trailing newline; appended marker + newline via printf.
- `ralph.md` was already modified in the working tree before the session started (harness added `npm run build` to RALPH_BUILD_COMMANDS). Not ours — never stage/commit it.
- `npm run test:contact` exits 1 immediately when SLACK_URL is unset (sandbox has no SLACK_URL / .env), before reaching the validation test. Environment limitation, unrelated to the change.

## Solutions That Worked
- Typecheck (`npm run typecheck`) and build (`npm run build`) both pass with exit 0.
- To exercise the no-network validation test without SLACK_URL: write a temp `.mts` file in /tmp that imports `/workspace/scripts/contact.ts` and run it with `npx tsx`. Passes (rejects 4 invalid fields, accepts valid input).

## Things to Avoid
- `npx tsx -e '...'` fails: eval runs as CJS and contact.ts has a top-level await (main guard). Use a temp .mts file instead.
- Don't commit ralph.md or this lessons file; acceptance requires only README.md in the commit.

## Files Modified
- README.md (appended marker line)

## Open Questions
- None.

## Next Steps
- None. Harness handles push/PR.
