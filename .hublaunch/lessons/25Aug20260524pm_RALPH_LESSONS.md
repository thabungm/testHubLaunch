# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✓
- All acceptance criteria verified
- All tests passing
- Typecheck passing
- Feature fully implemented and tested

## Key Discoveries
- Node v20 is available (not v24), so tsx fallback is required
- SLACK_URL comes from environment (with stray quotes/comma that needed cleaning)
- Package.json already existed with most of the needed structure
- README.md was already well-documented
- Validation must collect ALL issues before throwing, not just the first one

## Solutions That Worked
- Updated package.json scripts to use tsx (Node 20 compatibility)
- Verified SLACK_URL is available in environment from HubLaunch
- Implemented all functions according to spec: validateContact, buildSlackPayload, submitContactForm
- Used global fetch (Node 18+) for Slack requests
- Proper escaping of &, <, > in user input
- Truncation: header 150 chars, body ~2900 chars
- ESM direct-run guard works correctly

## Things to Avoid
- Do NOT add axios, node-fetch, or dotenv ✓ (avoided)
- Do NOT hard-code webhook URL anywhere ✓ (never logged)
- Do NOT send to Slack when validation fails ✓ (validation throws first)
- Do NOT mock Slack call in happy-path test ✓ (real send implemented)

## Files Modified
- /workspace/package.json - updated scripts to use tsx
- /workspace/scripts/contact.ts - CREATED with full implementation
- /workspace/scripts/test-contact.ts - CREATED with live test + validation test

## Acceptance Criteria Verified
- ✓ AC1: submitContactForm sends Block Kit message, returns {status: 200, body: "ok"}
- ✓ AC2: test-contact.ts performs real Slack send, prints PASS, exits 0
- ✓ AC3: validateContact rejects all bad fields, throws ContactValidationError with all issues
- ✓ AC4: With SLACK_URL unset, exits 1 with clear message
- ✓ AC5: Non-200 responses handled (tested with invalid URL)
- ✓ AC6: Webhook URL never printed to stdout/stderr
- ✓ AC7: Block Kit format correct, special chars escaped (&amp;, &lt;, &gt;)
- ✓ AC8: No runtime dependencies; uses global fetch, tsx for Node 20
- ✓ AC9: README.md documents setup and usage
