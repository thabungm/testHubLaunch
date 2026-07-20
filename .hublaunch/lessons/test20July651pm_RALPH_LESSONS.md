# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE — all files implemented, typecheck passes, all routes + tests verified
- Last action: Ready to commit
- Blockers: SLACK_URL not in env & no .env → live Slack Test1 fails at runtime BY DESIGN (plan says test fails w/o SLACK_URL). PROVEN to pass against a local mock webhook (200 "ok").

## Verification results (all passing)
- `npm run typecheck` (tsc --noEmit, strict) → 0 errors across scripts/ + src/
- Server routes (via curl on tsx server + mock Slack): GET / (AC1) ✓, GET /contact form (AC2) ✓, ?status banner ✓, POST valid → 302 status=ok + Slack got correct {"text":...} (AC3) ✓, invalid email → error ✓, empty body → error ✓, 404 ✓
- AC5: no SLACK_URL → submit redirects to error, server stays alive, logs "SLACK_URL environment variable is not set" (no URL leaked, AC6) ✓
- `npm test` with mock SLACK_URL=http://127.0.0.1:PORT → BOTH tests pass (pass 2 fail 0). Without SLACK_URL → Test1 fails (by design), Test2 passes.
- Message format matches plan exactly: "New contact form submission\n*Email:* ..\n*Subject:* ..\n*Body:*\n.."

## Solutions That Worked
- Run .ts via `tsx`; test via `tsx --test src/slack.test.ts` (node:test works under tsx on Node 20). Import paths keep `.ts` ext.
- To verify live-send path w/o real webhook: tiny local http server returning 200 "ok", set SLACK_URL to it. Files in /tmp must be `.mjs`/`.mts` (tsx treats /tmp .ts as CJS → top-level-await fails).

## Things to Avoid
- Don't assume Node v24 / native TS. Don't use `node src/server.ts`. Use tsx.
- Don't overwrite existing package.json scripts (kept contact/test:contact/typecheck; added start/dev/test).
- Root `test` (1-byte file) blocks a `test/` dir → test lives at src/slack.test.ts.

## Files Modified/Created
- CREATED: src/slack.ts, src/pages.ts, src/server.ts, src/slack.test.ts
- MODIFIED: package.json (added start/dev/test scripts), tsconfig.json (include src/**/*.ts), README.md (appended web-app section)
- .hublaunch/lessons/... (this file)

## Next Steps
- Done. Only outstanding item is a genuine live Slack send, which needs a real SLACK_URL secret unavailable in this sandbox.

## Key Discoveries
- **Node is v20.20.2, NOT v24** as the plan assumed. Native `.ts` type-stripping does NOT work. Must run `.ts` via `tsx` (repo's existing convention). `node --test` won't strip types either.
- Repo already has package.json (type:module) with devDeps tsx/typescript/@types/node and scripts: contact, test:contact, typecheck. MUST be additive — don't clobber existing scripts.
- Existing `scripts/contact.ts` + `scripts/test-contact.ts` = a *headless* 4-field (name/email/subject/body) contact→Slack feature with Block Kit. This plan is DIFFERENT: a web HTTP server with Landing (`GET /`) + Contact pages (`GET /contact`), 3 fields (email/subject/body), `POST /api/contact`, files in `src/`.
- Root has a 1-byte file named `test` → creating `test/` dir collides. Per plan Edge Case 4, put test at `src/slack.test.ts`.
- tsconfig has allowImportingTsExtensions + include:["scripts/**/*.ts"] → must add "src/**/*.ts" to include for typecheck to cover new files.
- `.env` gitignored; SLACK_URL forwarded via hublaunch.config.js (which is itself gitignored/empty here).

## Solutions That Worked
- (tbd)

## Things to Avoid
- Don't assume Node v24 / native TS. Don't use `node src/server.ts` — use `tsx`.
- Don't overwrite existing package.json scripts.

## Files Modified
- .hublaunch/lessons/... (this file)

## Next Steps
1. Create src/slack.ts, src/pages.ts, src/server.ts, src/slack.test.ts
2. Add scripts (start, dev) + test to package.json (additively); add src to tsconfig include
3. Run typecheck; run test (live will fail w/o SLACK_URL — document); manually curl server
4. Append README section
