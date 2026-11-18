# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: Complete
- Last action: Session 2 (2026-11-18) re-verified completed work; no new code changes needed
- Blockers: None

## Key Discoveries
- Plan is a disposable E2E smoke test: single-line append to README.md.
- README.md already ended with a trailing newline, so `printf '%s\n' ... >> README.md` appends cleanly.
- `ralph.md` was already modified in the working tree before the session — NOT part of this plan; left unstaged/uncommitted.
- No CONTRIBUTING.md, PR template, or DCO requirement in the repo.
- `npm run test:contact` exits early with "FAIL: SLACK_URL not set" in the sandbox (no `.env`, no env var). This is environmental and unrelated to README-only changes.

- Session 2: branch history after session 1 = 436b3e0 (README.md only, the plan change) -> c326453 (harness: ralph.md) -> 817ad8e (harness: lessons file). So `git log -1 --stat` now shows the harness lessons commit, not README.md; the plan's commit is 436b3e0. Do NOT re-append the marker (would duplicate it) or rewrite harness commits.
- node_modules is absent in a fresh sandbox: run `npm ci` (lockfile exists; leaves tree clean) before `npm run typecheck`.

## Solutions That Worked
- To exercise the network-free validation path without SLACK_URL: write a tiny script importing `validateContact` from `scripts/contact.ts` and run with `npx tsx`. The script must be `.mts` if placed outside the repo (contact.ts uses top-level await; a `.ts` outside the package is transformed as CJS and fails).

## Things to Avoid
- Don't run the throwaway check as a `.ts` file outside /workspace (CJS transform error on top-level await).
- Don't commit `ralph.md` or the lessons file — plan requires only README.md in the commit.

## Files Modified
- README.md (appended `<!-- hula-e2e e2e-a84edb4-1822-slim-plan-list-upnp7 e2e-a84edb4-smoke -->`)

## Verification Results
- Session 2 re-run (after `npm ci`): typecheck exit 0, build exit 0, test:contact exit 1 (SLACK_URL not set), validation-only check via /tmp/hl-check/validate.mts PASS (invalid rejected, valid accepted)
- `npm run typecheck`: pass (exit 0)
- `npm run build`: pass (exit 0)
- `npm run test:contact`: fails at the SLACK_URL precondition (environment has no webhook secret); validation-only path verified separately: PASS (rejected 4 invalid fields)

## Open Questions
- None

## Next Steps
- None — plan complete.
