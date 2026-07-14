# HubLaunch Lessons Learned (contactUs3)

Plan: 2026-07-09-17:14-landing-and-contact-us-pages.md — a WEB APP (landing +
contact form pages) that POSTs the contact form to Slack via SLACK_URL.

## Current Status
- Phase: COMPLETE. All files built, typecheck clean, all routes + tests verified.
- Blockers: only the genuine real-Slack live send (needs a real SLACK_URL webhook,
  absent here). Full POST path proven vs a LOCAL MOCK Slack (200 "ok"), payload
  contract exact.

## Verification results (ALL PASS)
- typecheck (tsc --noEmit strict): 0 errors.
- npm test vs mock SLACK_URL: both tests pass (live-send + throw). Payload =
  {"text":"New contact form submission\n*Email:* ...\n*Subject:* ...\n*Body:*\n..."},
  POST, Content-Type application/json. Exactly the plan's format.
- npm test with SLACK_URL unset: live test fails w/ clear assertion (by design),
  throw test passes.
- Server (tsx src/server.ts) curl e2e on all routes:
  GET / -> 200 Welcome/coming soon/link; GET /contact -> 200 form(email/subject/
  body, action=/api/contact); ?status=ok/error banners; POST valid -> 302
  /contact?status=ok + mock received payload; POST bad-email/empty -> 302 error;
  GET /nope -> 404.
- Missing SLACK_URL on POST: 302 error, server stays ALIVE (no crash), log shows
  "SLACK_URL environment variable is not set", NO url leak. AC5/AC6 met.
- No hardcoded webhook/token anywhere in src/ or scripts/.

## Runner command that works on Node 20
- Tests: `tsx --test src/slack.test.ts` (node:test TAP via tsx loader). npm test uses this.
- Server: `tsx src/server.ts`. npm start uses this.

## Test location
- Used src/slack.test.ts (root `test` 1-byte file blocks mkdir test/). Plan's fallback.

## Small improvement over plan reference
- server.ts exports `server` and only listens under the direct-run guard
  (import.meta.url === file://argv[1]) so it's importable in tests without binding a port.

## Critical environment facts (confirmed)
- **Node is v20.20.2, NOT v24** as the plan assumes. Node 20 CANNOT natively strip
  TS types. Must run .ts via `tsx` (devDependency already present, v4).
- **SLACK_URL is NOT set** and there is NO `.env`. hublaunch.config.js is gitignored/absent.
- A prior SIBLING feature already merged into main: `scripts/contact.ts` +
  `scripts/test-contact.ts` (headless {name,email,subject,body} Block Kit version).
  That is a DIFFERENT design. My plan is the web-app (src/server.ts) version. Keep
  both — my work is ADDITIVE (new src/ files, add npm scripts).
- Root `test` file (1 byte) exists -> cannot `mkdir test/` (name collision on Linux).
  => place test at `src/slack.test.ts` (plan's documented fallback).

## Adaptations from plan (Node 20)
- Run server via `tsx src/server.ts` (not `node src/server.ts`).
- Run tests via tsx importing node:test (verify exact invocation).
- Verify live-send path against local mock Slack server returning 200 "ok".

## Files to create
- src/slack.ts, src/pages.ts, src/server.ts, src/slack.test.ts
- update package.json (add start/test), tsconfig include, README.md

## Next Steps
- Write files, typecheck, run tests vs mock, manual curl of all routes.
