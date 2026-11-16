# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Committed d7b76b7 (README marker line). Branch diff vs main = plan file + README.md only (AC1, AC2 met).
- Blockers: None. `npm run test:contact` cannot pass in this sandbox (no SLACK_URL); this is environmental and unrelated to the change.

## Key Discoveries
- `ralph.md` shows as modified in the working tree. The harness did that, not this task. Do NOT commit it, because AC2 allows only README.md + the plan file on the branch.
- This lessons file is untracked. Leave it uncommitted for the same AC2 reason.
- `npm install` does not modify package-lock.json (it's already in sync).
- `scripts/test-contact.ts` exits 1 right away if SLACK_URL is unset, before it reaches the offline validation test.

## Solutions That Worked
- Append the marker with `printf '%s\n' '<marker>' >> README.md` (README already ended with a newline).
- To run the offline validation check alone without touching repo files, use a temp **.mts** file outside the repo that imports `/workspace/scripts/contact.ts` and run it with `npx tsx`. A `.ts` file outside the package gets treated as CJS and fails because contact.ts uses top-level await.

## Things to Avoid
- Don't put a temp `.ts` file outside the repo (CJS/top-level-await error). Use `.mts`.

## Files Modified
- README.md (committed in d7b76b7)

## Verification
- npm run typecheck: pass (0 errors)
- npm run build: pass
- npm run test:contact: FAIL, "SLACK_URL not set — cannot run live test" (environmental)
- Offline validation check (via .mts harness): PASS, rejected 4 invalid fields

## Next Steps
- None. Per the plan, the launch is disposable: close it unmerged.
