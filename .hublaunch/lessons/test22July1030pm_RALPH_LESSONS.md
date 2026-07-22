# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✅
- Last action: All tests passing, manual testing verified, implementation complete
- Blockers: None

## Plan Summary
Implemented a Node.js web app with:
- Landing page (GET /) - "Welcome, coming soon" with link to contact
- Contact form (GET /contact) - email, subject, body fields + optional status banner
- Form submission (POST /api/contact) - validates and posts to Slack via SLACK_URL
- Automated tests verifying live Slack send and missing config error handling
- Tech: TypeScript + Node via tsx (for Node v20 compatibility)

## Key Discoveries
- System has Node v20.20.2 (not v24 mentioned in plan), so needed tsx fallback
- SLACK_URL from environment has trailing formatting chars (quotes, comma) - added regex strip
- Root "test" file blocks test/ directory creation - used src/slack.test.ts instead (as plan suggested)
- Existing implementation in scripts/ was different approach (Block Kit messages, validation class)

## Solutions That Worked
1. **URL cleanup regex**: `replace(/^["']|["',]*$/g, "")` handles SLACK_URL from env with extra formatting
2. **tsx installation**: npm install --save-dev tsx@^4 provides Node v20 compatibility
3. **Fixed scripts**: "start": "tsx src/server.ts", "test": "tsx --test src/slack.test.ts"
4. **Test location**: src/slack.test.ts discovered by tsx --test and runs both tests successfully

## Things to Avoid
- Don't add Express, Next.js, React, or build tooling ✓
- Don't log or echo the SLACK_URL webhook ✓
- Don't reflect raw user input into HTML (XSS risk) ✓
- Don't use test frameworks besides node:test ✓

## Files Modified/Created
- package.json - updated with tsx dev dep and scripts for tsx
- src/slack.ts - sendContactToSlack() function + Contact interface
- src/pages.ts - landingPage() and contactPage() HTML generators
- src/server.ts - HTTP server with routes: GET /, GET /contact, POST /api/contact
- src/slack.test.ts - two tests: live Slack send + missing config throw
- README.md - complete documentation of setup, usage, API

## All Acceptance Criteria Met
✓ AC1: GET / returns "Welcome" + "coming soon" + link to /contact
✓ AC2: GET /contact returns form with email, subject, body fields
✓ AC3: Valid form submits to Slack and redirects to /contact?status=ok
✓ AC4: Live test posts real message and asserts HTTP 200 + body "ok"
✓ AC5: Missing SLACK_URL throws error, redirects to /contact?status=error
✓ AC6: Webhook URL never printed (only status/body logged)
✓ AC7: No runtime dependencies, only tsx as dev fallback
✓ AC8: README.md documents full setup/usage/testing

## Test Results
- Live Slack send test: PASS ✓ (HTTP 200 "ok")
- Missing SLACK_URL test: PASS ✓ (throws correctly)
- Manual endpoint tests: ALL PASS ✓
  - GET / works, shows Welcome + link
  - GET /contact works, shows form
  - Valid form submission redirects to success
  - Invalid emails redirect to error
  - Missing fields redirect to error
  - Success/error banners display correctly
  - Navigation links work both directions
