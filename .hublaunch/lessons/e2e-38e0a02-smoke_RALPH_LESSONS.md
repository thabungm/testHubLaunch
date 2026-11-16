# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: Complete
- Last action: Appended marker line to README.md and committed only README.md
- Blockers: None (live Slack test cannot run in sandbox — see below)

## Key Discoveries
- Plan is a disposable E2E smoke test: append one marker line to README.md.
- `ralph.md` arrives pre-modified in the working tree (harness adds `npm run build`
  to RALPH_BUILD_COMMANDS). Not part of the plan — do NOT commit it.
- `SLACK_URL` is not set in the sandbox, so `npm run test:contact` exits 1 at the
  live-send precheck before reaching the validation test.
- `scripts/contact.ts` uses top-level await (guarded by `import.meta.url` check), so
  ad-hoc tsx scripts outside the repo must be `.mts` (ESM) or they fail with
  "Top-level await is currently not supported with the cjs output format".

## Solutions That Worked
- Validate the offline (no-network) leg separately with a temp `/tmp/.../check.mts`
  importing `validateContact`/`ContactValidationError` -> PASS (4 issues).
- `npm run typecheck` and `npm run build` both pass with zero errors.

## Things to Avoid
- Don't run ad-hoc tsx checks as `.ts` in a dir without `"type": "module"`.
- Don't `git add -A` — would sweep in ralph.md and this lessons file.

## Files Modified
- README.md (marker line appended) — committed.

## Open Questions
- None.

## Next Steps
- None; plan complete.
