# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created outdated-packages report, applied safe upgrades, opening PR
- Blockers: None

## Key Discoveries
- Plan: check-outdated-packages (weekly dependency audit) → deliverable is a PR.
- Prior audit PR #108 established convention: `reports/outdated-packages-YYYY-MM-DD.md`.
- Project is a small tsx/TS script project. Deps: @types/node ^20, tsx ^4, typescript ^5.
- Outdated: @types/node 20.19.43→26.1.1 (major), typescript 5.9.3→7.0.2 (major). tsx already latest (4.23.1).
- npm audit: 0 vulnerabilities.

## Solutions That Worked
- `npm install` first (deps were not installed; tsc not found until install).
- Tested upgrades by installing @latest then running `npm run typecheck` — PASSED.
- tsx runtime smoke test via a temp .ts in workspace root importing ./scripts/contact.ts — PASSED.
- `npm install typescript@latest @types/node@latest` auto-updated package.json ranges to ^7.0.2 / ^26.1.1.

## Things to Avoid
- Don't run `test:contact` — it requires SLACK_URL and does a REAL network Slack send.
- Relative imports in tsx smoke test must resolve from workspace root, not /tmp.

## Files Modified
- package.json (dep version bumps), package-lock.json (npm install)
- reports/outdated-packages-2026-07-19.md (new report)

## Next Steps
- Commit on branch, open PR documenting outdated packages + applied upgrades.
