# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✓
- Task: Add Contact Us feature (Slack form submission)
- Final action: All files created, tested, verified
- Result: ALL TESTS PASS

## Key Discoveries
- The repo already has `SLACK_URL` in environment forwarded via HubLaunch
- No `package.json` existed initially - created from scratch with proper ESM setup
- `scripts/` directory didn't exist - created and populated
- Requirement: live test that ACTUALLY sends to Slack (HTTP 200 response check) ✓
- Email validation regex: `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`
- Node v24.11.1 supports native TS execution without transpilation

## Solutions That Worked
- Used ESM module detection: `if (import.meta.url === file://${process.argv[1]})`
- Used tsx for running TypeScript files (installed as devDependency)
- Block Kit payload structure with header, fields section, and message section
- Escape function for &<> characters in Slack messages
- Proper truncation: subject header to 150 chars, body to 2900 chars

## Things to Avoid
- Do NOT add axios, node-fetch, or dotenv - use native fetch ✓
- Do NOT hard-code or echo SLACK_URL ✓
- Do NOT mock Slack calls in happy-path test ✓
- Do NOT send to Slack when validation fails ✓
- Do NOT introduce a build/transpile pipeline ✓
- Do NOT commit .env file ✓

## Files Modified/Created
- **CREATED** package.json - ESM with npm scripts (contact, test:contact, typecheck)
- **CREATED** scripts/contact.ts - Validation, payload builder, sender, smoke test
- **CREATED** scripts/test-contact.ts - Live test + validation test
- **REVIEWED** README.md - Already has complete documentation
- **UPDATED** .hublaunch/lessons/28Aug20260617pm_RALPH_LESSONS.md - This file

## Test Results
✓ npm run typecheck - PASSES (zero errors)
✓ npm run test:contact - PASSES (both tests pass, real Slack send successful)
✓ npm run contact - PASSES (HTTP 200, message sent)
✓ Edge case: SLACK_URL unset - Proper error message, exit 1
✓ Edge case: Network error - Proper error handling
✓ Validation: Rejects blank fields + invalid email
✓ Validation: No Slack message sent on invalid input

## Acceptance Criteria Status
✓ AC1: submitContactForm posts Block Kit message, returns {status: 200, body: "ok"}
✓ AC2: test:contact performs real Slack send, prints PASS
✓ AC3: validateContact rejects invalid input, no Slack message sent
✓ AC4: SLACK_URL unset throws clear error message
✓ AC5: Non-200 response causes proper error reporting
✓ AC6: SLACK_URL never printed to stdout/stderr
✓ AC7: Slack message uses Block Kit with proper escaping
✓ AC8: No runtime npm dependencies; runs via node scripts/*.ts
✓ AC9: README.md has complete documentation

## Next Steps
- COMPLETE: All implementation done
- COMPLETE: All tests passing
- COMPLETE: All acceptance criteria met
- Ready for: Commit and merge

## Final Notes
- Implementation follows the reference implementation from the plan
- All four fields (Name, Email, Subject, Body) are validated correctly
- Block Kit message structure matches Slack API requirements
- Live test includes ISO timestamp in subject for easy identification in Slack
- Test actually sends a real message to Slack (not mocked)
- No runtime dependencies - uses Node 24 native fetch and ESM
