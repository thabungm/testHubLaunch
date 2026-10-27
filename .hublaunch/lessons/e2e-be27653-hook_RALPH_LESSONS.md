# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Appended E2E marker to README.md, verified minimal diff
- Blockers: None

## Key Discoveries
- Disposable E2E plan: append one HTML comment line to README.md, nothing else.
- README.md ended cleanly with `.\n` (85 lines). Appended marker now 86 lines.
- Per plan: typecheck/test/build are explicitly out of scope (markdown comment cannot affect them).

## Solutions That Worked
- `printf '%s\n' '<!-- hula-e2e e2e-be27653-hook -->' >> README.md` — guarantees exact literal text + single trailing newline.
- Verified with `git diff` (exactly 1 added line), `od -c` (ends `-->\n`).

## Things to Avoid
- Do not run formatters or touch any other file; scope is README-only.

## Files Modified
- README.md (one added line: the E2E marker comment)

## Open Questions
- None.

## Next Steps
- Operator/pipeline closes the resulting PR unmerged (not an implementation action).

## Follow-up: typecheck "tsc: not found"
- Cause: `node_modules/` was never installed in this sandbox (fresh checkout), not a code/type error. `npm run typecheck` just shells out to `tsc`, which doesn't exist until deps are installed.
- Fix: run `npm install` (installs typescript/tsx/@types/node from package.json), then `npm run typecheck` passes with zero errors/warnings.
- No source files needed changes. `node_modules/` is already gitignored, so nothing to stage/commit from the install.
