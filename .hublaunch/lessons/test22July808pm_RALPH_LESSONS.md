# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE — all plan items implemented, tested, verified.
- Last action: Added web server (Landing + Contact pages) under src/, all tests green.
- Blockers: None.

## Key Discoveries
- Plan assumed Node v24 (native TS type-stripping) but repo runs **Node v20.20.2**.
  Solution: use `tsx` (already a devDependency) instead of `node src/*.ts` and
  `node --test`. Scripts: `start: "tsx src/server.ts"`, `test: "tsx --test src/slack.test.ts"`.
- A prior merged PR added a DIFFERENT, headless Contact feature under `scripts/`
  (contact.ts + test-contact.ts, with a `name` field + Block Kit). This plan is a
  SEPARATE web-server feature under `src/` (email/subject/body, simple {text} payload).
  Both coexist — additive only, did NOT touch scripts/.
- The root `test` file (1 byte) blocks creating a `test/` directory → used the
  plan's documented fallback location `src/slack.test.ts`.
- **CRITICAL**: the forwarded `SLACK_URL` env value is malformed — it literally
  includes surrounding double-quotes AND a trailing comma:
  `"https://hooks.slack.com/...",`. Plain `.trim()` isn't enough; `fetch` throws
  "Failed to parse URL". Fix: `normalizeSlackUrl()` in src/slack.ts strips a
  trailing comma and wrapping quotes. This made the live Slack send succeed.

## Solutions That Worked
- `normalizeSlackUrl()` sanitizer in src/slack.ts (strip trailing comma + quotes).
- tsx for running/testing .ts on Node 20.
- Merged package.json scripts (added start + test, kept contact/test:contact/typecheck
  + devDependencies). Updated tsconfig include to add "src/**/*.ts".
- Verified server end-to-end with curl (all routes, valid/invalid POST, 404,
  status banners, missing-config path). Live Slack test posts HTTP 200 "ok".

## Things to Avoid
- Don't `pkill -f 'server.ts'` — it matches and SIGTERMs the bash shell itself
  (exit 144). Use `pgrep -f 'tsx src/server.ts'` and kill specific PIDs.
- Killing the `npx` parent can orphan the node child holding the port (EADDRINUSE).
  Use `nohup ... & disown` and kill by pgrep, or use a distinct PORT per run.

## Files Modified / Created
- src/slack.ts (NEW) — sendContactToSlack + normalizeSlackUrl
- src/pages.ts (NEW) — landingPage, contactPage
- src/server.ts (NEW) — http server, routes, form handling
- src/slack.test.ts (NEW) — live send test + missing-config throw test
- package.json (edited) — added start + test scripts
- tsconfig.json (edited) — added src/**/*.ts to include
- README.md (edited) — added web-app section

## Verification Results (all pass)
- `npm run typecheck` → clean, 0 errors
- `npm test` → 2/2 pass (live Slack 200 ok; throw-on-missing-config)
- curl: GET / (200, Welcome/coming soon/link), GET /contact (200, form fields +
  action), status banners, POST valid → 302 ?status=ok (live Slack), POST bad
  email → 302 ?status=error, GET /nope → 404, missing SLACK_URL → 302 error + no
  crash + no URL leak (leak grep = 0).

## Next Steps
- None. Feature complete. Optionally commit.
