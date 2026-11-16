# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed 77e0953 "e2e: append hula-e2e marker to README (e2e-956248e-t1)"
- Blockers: None. `npm run test:contact` can't pass in this container because SLACK_URL isn't set (environment limitation, see below).

## Key Discoveries
- The plan is a disposable E2E test: append one marker line to README.md. AC2 = only README.md + the plan file may differ from main.
- `ralph.md` already had an uncommitted change when the session started (it adds `npm run build` under RALPH_BUILD_COMMANDS). It's a harness file: do NOT commit it, or AC2 breaks.
- The lessons file itself is untracked. Do NOT commit it either (AC2).
- README.md already ended with `\n`, so `printf '%s\n' '<marker>' >> README.md` appends cleanly.
- `node_modules` isn't present at start; run `npm install` first or `tsc` is "not found". Watch out: piping to `tail` hides the real exit code, so capture `$?` separately.
- `npm run build` = `node scripts/build.mjs` = `tsc --noEmit` (no artifacts).
- `npm run test:contact` exits 1 right away if SLACK_URL is unset (scripts/test-contact.ts:9-11), before running any test.
- No CONTRIBUTING.md, no PR template, no DCO requirement in the repo.

## Solutions That Worked
- Offline validation check without Slack: write a `.mts` file (must be ESM; a `.ts` outside the package is treated as CJS and fails on contact.ts's top-level await), import `validateContact` from `/workspace/scripts/contact.ts`, run with `npx tsx`. It's safe to import because contact.ts only runs main() behind an `import.meta.url` guard.
- Commit with `git add README.md` only (not `-A`).

## Things to Avoid
- `git add -A` (would pull in ralph.md + lessons file and break AC2).
- `git stash` (would also stash the harness's ralph.md change).
- Inventing a SLACK_URL or editing the test to skip the live send (out of scope).

## Files Modified
- README.md (committed in 77e0953)
- .hublaunch/lessons/e2e-956248e-t1_RALPH_LESSONS.md (this file, uncommitted on purpose)

## Verification Results
- AC1 PASS: the committed README.md's last line is the marker.
- AC2 PASS: `git diff --name-only main HEAD` = plan file + README.md.
- `npm run typecheck`: exit 0. `npm run build`: exit 0.
- `npm run test:contact`: exit 1 (SLACK_URL not set; env limitation, unrelated to the README-only change).
- Offline validation check (test-contact's Test 2 logic): PASS, 4 invalid fields rejected.

## Open Questions
- None.

## Next Steps
- None. The task is complete. Per the plan, the branch should be closed unmerged.
