# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: All tests passing, verification complete
- Blockers: None

## Key Discoveries
- package.json already exists with `"type": "module"` and contact/test:contact scripts
- scripts/ directory exists but had no .ts files yet
- Node v20.20.2 installed (plan mentioned v24 but tsx is already configured as fallback)
- tsconfig.json and build.mjs already in place
- .env is gitignored (SLACK_URL provided by HubLaunch runtime)
- SLACK_URL from HubLaunch includes quotes and trailing comma: `"url",` - fixed in code with regex

## Solutions That Worked
- Handle HubLaunch SLACK_URL format by removing quotes and trailing comma: `url.replace(/^["']/, '').replace(/["',]*$/, '')`
- Use tsx for running TypeScript files (works on Node v20+)
- Live tests work with real Slack webhook, validation tests work without network

## Things to Avoid
- Don't hardcode or echo SLACK_URL anywhere ✓
- Don't send to Slack if validation fails ✓
- Always trim and clean SLACK_URL from environment variables ✓

## Files Modified
- Created: scripts/contact.ts (exports ContactInput, ContactValidationError, validateContact, buildSlackPayload, submitContactForm, main smoke test)
- Created: scripts/test-contact.ts (live test + validation test)
- Verified: README.md (already complete and accurate)
- Verified: package.json (already configured correctly)

## Verification Results
- ✓ npm run typecheck → 0 errors
- ✓ npm run contact → "Contact submitted to Slack (HTTP 200)"
- ✓ npm run test:contact → "PASS (live send)" + "PASS (validation)" + "ALL PASS"
- ✓ Block Kit message appears in Slack
- ✓ Validation rejects invalid input without sending to Slack
- ✓ No SLACK_URL ever logged to output

## All Requirements Met
- ✓ AC1: submitContactForm posts Block Kit to Slack, returns {status: 200, body: "ok"}
- ✓ AC2: test:contact performs real Slack send, prints PASS, exits 0
- ✓ AC3: validateContact rejects invalid input with ContactValidationError, no send
- ✓ AC4: Missing SLACK_URL handled gracefully with clear message
- ✓ AC5: Non-200 response logged (not hit in tests, but handler in place)
- ✓ AC6: SLACK_URL never printed to stdout/stderr
- ✓ AC7: Block Kit format with escaped user input (&, <, >)
- ✓ AC8: No runtime npm dependencies, runs via tsx
- ✓ AC9: README.md fully documents setup and usage
