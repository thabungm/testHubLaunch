# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed 0cfff66 "docs: append hula-e2e marker for e2e-38e0a02-s1" (README.md only)
- Blockers: None

## Key Discoveries
- Plan is a disposable E2E test: single step = append marker line to README.md.
- AC2 restricts branch diff to README.md + the plan file, so do NOT commit:
  - `ralph.md` (harness-injected working-tree change adding `npm run build` to RALPH_BUILD_COMMANDS)
  - this lessons file (untracked; persists in workspace without being committed)
- README.md already ended with a trailing newline, so `printf '%s\n' ... >> README.md` appends cleanly.
- `npm run test:contact` exits 1 immediately when SLACK_URL is unset ("FAIL: SLACK_URL not set"),
  BEFORE reaching the no-network validation test. Not caused by this change (README-only diff).
  SLACK_URL is not present in env or .env in this container.

## Solutions That Worked
- Run the validation-only assertion out-of-repo: write a .mts file in /tmp that imports
  `/workspace/scripts/contact.ts` by absolute path and run with `npx tsx <file>`. Wrapping
  globalThis.fetch to count calls confirms no network call on invalid input (4 issues, 0 fetches).

## Things to Avoid
- `npx tsx -e '<code with ESM imports>'` fails (eval runs as CJS) — use a temp .mts file instead.
- `xxd` is not installed; use `cat -A` / `tail -c` for byte inspection.

## Verification Results
- AC1: PASS (HEAD README.md last line == marker)
- AC2: PASS (`git diff --name-only main...HEAD` = plan file + README.md)
- `npm run typecheck`: PASS (0 errors)
- `npm run build`: PASS
- `npm run test:contact`: live test BLOCKED (no SLACK_URL in env); validation path verified separately: PASS

## Files Modified
- README.md (committed in 0cfff66)

## Open Questions
- None. Live Slack test can only be run where SLACK_URL is provisioned.

## Next Steps
- None — plan 100% complete. Per plan, the branch/PR is disposable: close unmerged.
