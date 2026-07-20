# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Implemented the src/ web app per plan, verified end-to-end, README updated.
- Blockers: None (see SLACK_URL note below).

## Key Discoveries
- A PRIOR session/PR (commit e4bf664) already implemented a DIFFERENT, *headless*
  contact-to-Slack feature under `scripts/` (contact.ts, test-contact.ts). The
  plan I was given instead requires a full **web app** under `src/`
  (landing page + contact page + HTTP server). These are two separate
  approaches — I left `scripts/` untouched (additive) and added `src/`.
- Runtime is **Node v20.20.2**, NOT v24 as the plan assumed. Node 20 CANNOT run
  `.ts` files natively (no type-stripping). Must use `tsx` (already a
  devDependency). Plan documented this fallback.
- `SLACK_URL` is NOT set in this environment and there is no `.env` file
  (it's gitignored; hublaunch.config.js is also gitignored/empty here). So the
  plan's LIVE Slack test cannot post to a real webhook here — by design it FAILS
  when SLACK_URL is unset. That is expected/intended behavior, not a bug.

## Solutions That Worked
- Installed deps with `npm install` to get `tsx`.
- Created src/slack.ts, src/pages.ts, src/server.ts, src/slack.test.ts exactly
  per the plan's reference implementations.
- Test placed at `src/slack.test.ts` (NOT `test/`) because a 1-byte `test` file
  exists at repo root and blocks a `test/` dir — plan's documented fallback.
- package.json: added `"start": "tsx src/server.ts"` and
  `"test": "tsx --test src/slack.test.ts"` (adapted from plan's node commands
  since Node 20 can't strip types). Kept existing scripts + devDeps.
- tsconfig.json `include` extended to `["scripts/**/*.ts", "src/**/*.ts"]`.
- To VERIFY the live path without a real webhook: stood up a local mock HTTP
  server returning `200 ok`, pointed SLACK_URL at it. With that set, `npm test`
  = 2/2 pass, and the full server flow (GET /, GET /contact, POST /api/contact
  valid->status=ok, bad email->status=error, empty body->error, 404, banners)
  all verified via curl. Confirmed exact Slack payload format matches the plan
  and that the webhook URL is never logged.

## Things to Avoid
- Don't try `tsx -e "...top-level await..."` or run a `.ts` from /tmp — esbuild
  treats it as CJS and rejects top-level await. Put probe files inside /workspace
  (inherits "type":"module") or use node:test.
- Don't delete the root `test` file; don't create a `test/` directory.

## Files Modified / Created
- CREATED: src/slack.ts, src/pages.ts, src/server.ts, src/slack.test.ts
- MODIFIED: package.json (added start + test scripts), tsconfig.json (include src),
  README.md (appended web-app section)
- Untouched: scripts/contact.ts, scripts/test-contact.ts (prior headless impl)

## Open Questions
- The live Slack test requires a real SLACK_URL + network to actually post.
  In CI/containers with SLACK_URL forwarded it will pass; here it can only be
  proven via a local mock. This is inherent to the plan's "post live" choice.

## Next Steps
- None — implementation complete, typecheck clean, tests pass with SLACK_URL set.
