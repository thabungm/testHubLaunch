# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✅
- Last action: Full verification passed (typecheck 0 errors, 2/2 tests pass, manual server E2E all green)
- Blockers: None

## COMPLETION SUMMARY
- Built the plan's web app: src/slack.ts, src/pages.ts, src/server.ts, src/slack.test.ts.
- package.json: added `start` (tsx src/server.ts) + `test` (tsx --test src/slack.test.ts);
  kept existing contact/test:contact/typecheck scripts.
- tsconfig include extended to src/**/*.ts.
- README: added a "web app" section (routes, run, test) above the existing headless docs.
- KEY FIX: sandbox SLACK_URL is malformed (leading `"`, trailing comma). Underlying URL
  is valid (returns 200 ok when cleaned). Made sendContactToSlack defensively strip
  wrapping quotes + trailing comma — harmless for a clean URL. This was required for the
  live test to pass here.
- Verified all ACs: GET / , GET /contact, POST valid->ok redirect + live Slack send,
  bad email/empty->error redirect, SLACK_URL-unset->error redirect no crash no URL leak,
  404 for unknown routes, no npm deps added.

## Key Discoveries
- **Node is v20.20.2, NOT v24** as the plan assumed. Native TS type-stripping
  (`node src/server.ts`) does NOT work. Must run `.ts` via `tsx` (already a
  devDependency). `node --test` also won't strip `.ts` on v20 — run tests via `tsx --test`.
- **SLACK_URL IS set in the environment** (len 82) — live Slack test can run.
- A PRIOR plan/PR already added a DIFFERENT, headless "Contact Us" feature in
  `scripts/contact.ts` + `scripts/test-contact.ts` (4 fields: name/email/subject/body,
  no HTTP server, no pages). This does NOT satisfy the current plan, which requires
  a web app: Landing page (`GET /`) + Contact page (`GET /contact`) + `POST /api/contact`.
- The current plan wants 3 fields: email, subject, body. Build the plan's `src/` app.
- Root has a 1-byte file named `test` → cannot `mkdir test/` (collision). Per plan
  edge case, put the test at `src/slack.test.ts`.
- `.env` does not exist as a file here, but SLACK_URL is exported already.

## Solutions That Worked
- `npm install` pulls tsx/typescript/@types/node.

## Things to Avoid
- Do NOT use `node src/*.ts` (fails on Node 20). Use tsx.
- Do NOT delete the existing `scripts/` implementation or the root `test` file.

## Files Modified
- (pending) src/slack.ts, src/pages.ts, src/server.ts, src/slack.test.ts, package.json, tsconfig.json, README.md

## Next Steps
- Create src/ files, wire package.json scripts (start/test), run typecheck + test.
