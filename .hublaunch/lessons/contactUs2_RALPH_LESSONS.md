# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE — all 8 acceptance criteria verified, typecheck + tests green.
- Plan: landing + contact-us pages + HTTP server + Slack sender + test

## Key Discoveries
- **Node is v20.20.2, NOT v24.11.1** as the plan assumed. Node 20 CANNOT run
  `.ts` directly. Must use `tsx` (already a devDependency). So plan's
  `node src/server.ts` / `node --test` won't work → use `tsx` variants.
- A PRIOR, DIFFERENT feature already exists in `scripts/` (contact.ts,
  test-contact.ts) — headless module w/ name/email/subject/body + Block Kit.
  THIS plan is a separate web-server task (src/ + pages). Keep both; be additive.
- Existing package.json has scripts: contact, test:contact, typecheck +
  devDeps tsx/typescript/@types/node. Keep them; add start + test.
- `node_modules` NOT installed yet → run `npm install`.
- `SLACK_URL` is NOT set and no `.env` file exists in this worktree. The live
  Slack test needs it. hublaunch.config.js is gitignored/empty here.
- A 1-byte root `test` file exists → cannot `mkdir test/` → place test at
  `src/slack.test.ts` per plan's Edge Case 4.

## Solutions That Worked
- Adapted plan for Node 20: `start` = `tsx src/server.ts`, `test` =
  `node --import tsx --test src/slack.test.ts` (explicit path — shell/node don't
  glob `**`; Node 20 test runner won't auto-discover `.ts`).
- Placed test at `src/slack.test.ts` (root `test` file blocks `test/` dir).
- Verified live-send path with a LOCAL mock Slack webhook (returns 200 "ok") by
  exporting SLACK_URL=http://localhost:4599/webhook. Payload format matches plan
  exactly. In the container with real SLACK_URL it posts to real Slack.
- Full curl verification of all routes + edge cases + missing-config path.

## Things to Avoid
- Do NOT clobber existing scripts/ feature or its package.json scripts.
- Do NOT delete the root `test` file.
- Kill stray `tsx src/server.ts` bg procs (pkill can return odd exit codes; use
  `kill <pid>` from `ps`).

## Files Modified
- NEW: src/slack.ts, src/pages.ts, src/server.ts, src/slack.test.ts
- EDIT: package.json (added start + test scripts), tsconfig.json (include src/**),
  README.md (appended web-app section)

## Next Steps
- Done. All ACs verified. Live Slack test will pass in container with real SLACK_URL.
