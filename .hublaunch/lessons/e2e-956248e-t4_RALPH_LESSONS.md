# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed 328c061 "docs: append hula-e2e marker to README (e2e-956248e-t4)"
- Blockers: None

## Key Discoveries
- Plan = append one marker line to README.md; AC2 restricts branch diff to README.md + plan file.
- `ralph.md` had a pre-existing uncommitted edit (adds `npm run build` to RALPH_BUILD_COMMANDS) — not ours; deliberately left uncommitted to satisfy AC2.
- This lessons file is untracked; keep it out of commits (AC2).
- `npm run build` = `scripts/build.mjs` → `tsc --noEmit` only; produces no output files.
- `npm run test:contact` hard-fails immediately when `SLACK_URL` is unset (environmental; sandbox has no webhook). Its Test 2 (validation, no network) can be run standalone.

## Solutions That Worked
- Run validation-only check via a temp `.mts` file outside the repo importing `/workspace/scripts/contact.ts` with `npx tsx <file>` (contact.ts's `main()` is guarded by `import.meta.url` check, so importing is safe).

## Things to Avoid
- `npx tsx -e '...'` fails: eval runs as CJS and contact.ts has top-level await ("Top-level await is currently not supported with the cjs output format").
- Don't `git add -A` — would sweep in ralph.md and this lessons file, violating AC2.

## Files Modified
- README.md (appended `<!-- hula-e2e e2e-956248e-1635 e2e-956248e-t4 -->`)

## Verification Results
- `npm run typecheck`: exit 0
- `npm run build`: exit 0
- `npm run test:contact`: FAIL — SLACK_URL not set (live Slack send cannot run in sandbox)
- Standalone validation check: PASS (rejected 4 invalid fields)
- AC1: README.md last line matches marker — OK
- AC2: `git diff --name-only main...HEAD` = plan file + README.md only — OK

## Open Questions
- None. Plan says "Close unmerged" — no PR merge intended.

## Next Steps
- None; task complete.
