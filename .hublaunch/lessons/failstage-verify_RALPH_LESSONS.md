# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: ✅ COMPLETE - All acceptance criteria verified
- Implementation: Fully complete and tested
- All type-checks pass
- All regression tests pass
- All edge cases verified

## Key Discoveries
- contact.ts exists with all required exports: ContactInput, ContactValidationError, validateContact, buildSlackPayload, submitContactForm, and direct-run main()
- test-contact.ts exists with live test (actual Slack send) + validation rejection test
- package.json already configured with "type": "module" and scripts (contact, test:contact)
- Scripts use tsx for runtime (Node v20.20.2)
- contact.ts includes robust SLACK_URL handling with quote/comma removal for environment variable quirks
- README.md is comprehensive and documents all usage patterns

## Solutions That Worked
1. **Direct TypeScript execution**: Using `tsx` in npm scripts works perfectly on Node 20 (within the specified requirements of Node ≥22 native, with tsx fallback)
2. **Environment variable passing**: SLACK_URL is correctly read from process.env without parsing .env file
3. **Block Kit formatting**: Message payload correctly uses header + fields + section structure
4. **Input escaping**: Proper HTML entity escaping (&, <, >) prevents malformed Slack messages
5. **Validation collection**: All validation issues are collected before any network call

## Things to Avoid
- Don't hard-code webhook URLs anywhere
- Don't send to Slack when validation fails
- Don't use external dependencies for HTTP (rely on native fetch)
- Don't log the SLACK_URL environment variable value

## Files Modified
- .hublaunch/lessons/failstage-verify_RALPH_LESSONS.md (status update)

## Verification Results - ALL ACCEPTANCE CRITERIA MET ✓

### AC1: submitContactForm posts Block Kit message ✓
- Block Kit structure present with header, fields, and section
- Message includes escaped user content
- Subject truncated to 150 chars in header, body to 2900 chars

### AC2: Live test performs real Slack send ✓
- `npm run test:contact` returns "PASS (live send): HTTP 200, body: ok"
- Exits with code 0 on success
- Subject includes ISO timestamp for Slack message identification

### AC3: validateContact rejects all invalid fields ✓
- Test returns "PASS (validation): rejected 4 invalid fields"
- No Slack message sent on validation failure
- All issues collected before throwing ContactValidationError

### AC4: Missing SLACK_URL handled correctly ✓
- Test prints "FAIL: SLACK_URL not set — cannot run live test"
- Exits with code 1
- Contact script prints "Contact error: SLACK_URL environment variable is not set"

### AC5: Non-200 response handling ✓
- Code checks `if (status !== 200)` and reports failure
- Status and body are logged (but never the URL)

### AC6: Webhook URL never printed ✓
- Verified: No grep match for "hook" in stdout/stderr
- Only status, body, and error messages are printed

### AC7: Block Kit with escaping ✓
- Message uses mrkdwn fields and plain_text headers
- Special characters (&, <, >) are properly escaped to &amp;, &lt;, &gt;
- Email validation regex `/^[^@\s]+@[^@\s]+\.[^@\s]+$/` rejects all invalid formats

### AC8: No runtime npm dependencies ✓
- Only devDependencies: @types/node, tsx, typescript
- Uses global fetch (Node 18+)
- No runtime dependencies like axios, node-fetch, or dotenv

### AC9: README documentation ✓
- Comprehensive README.md with:
  - Node version requirements
  - Setup instructions (export SLACK_URL)
  - Usage for both CLI smoke test and live test
  - API documentation for all exports
  - Notes on .env handling and fallback patterns

## Edge Cases Verified
1. **Very long subject/body**: Correctly truncated to 150/2900 chars
2. **Special characters in input**: Properly escaped for Slack
3. **Invalid email formats**: All properly rejected by regex
4. **Whitespace handling**: Trimmed correctly on all fields
5. **Missing SLACK_URL**: Clear error message, no network call attempted

## Type-Check & Lint Results
```
✓ npm run typecheck: PASSES with no errors
✓ npm run test:contact: PASSES with "ALL PASS"
```

## Manual Testing Checklist
- [x] Setup: SLACK_URL exported from .env
- [x] Happy path CLI smoke test: `npm run contact` → exits 0
- [x] Happy path live test: `npm run test:contact` → exits 0 with "ALL PASS"
- [x] Missing SLACK_URL: Both scripts exit 1 with clear message
- [x] Invalid webhook: Script reports HTTP status and exits 1
- [x] Type safety: All TypeScript compiles without errors

## Next Steps
NONE - Implementation is complete and fully verified. Ready for production.
