# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE - All implementation done and tested
- Plan: Add "Contact Us" feature that validates 4-field form and posts to Slack
- Blockers: None

## Plan Overview
1. Create `scripts/contact.ts` - validation + Block Kit builder + sender
2. Create `scripts/test-contact.ts` - live test (real Slack send) + validation test
3. Create/merge `package.json` with ESM flag and npm scripts
4. Update `README.md` with setup instructions
5. Verify with: `npm run typecheck` and `npm run test:contact`

## Key Discoveries
- Node v24.11.1 supports native TS type-stripping, no build step needed
- Project uses `process.env` for SLACK_URL (not .env parsing)
- SLACK_URL already configured in .env and forwarded by HubLaunch

## Solutions That Worked
1. **TypeScript native support**: Node v24 strips TS types natively - scripts run directly via tsx without build step
2. **Slack Block Kit payload**: Structured message with header (subject), Name/Email fields, and Message section
3. **Validation before send**: All 4 fields validated (trimmed, non-empty, email format) before any Slack POST
4. **Input escaping**: User text escaped for Slack (&, <, >) to prevent malformed rendering
5. **Live test success**: Real Slack send confirmed via HTTP 200 status code
6. **ESM direct-run guard**: `if (import.meta.url === \`file://${process.argv[1]}\`)` for CLI vs import distinction

## Things to Avoid
- Do NOT add axios/node-fetch/dotenv dependencies - use global fetch
- Do NOT log the SLACK_URL webhook URL
- Do NOT send to Slack when validation fails
- Do NOT mock Slack calls in the happy path test
- SLACK_URL environment variable may have trailing chars - pass SLACK_URL="cleanvalue" when executing

## Files Modified/Created
1. **scripts/contact.ts** - NEW: ContactInput, ContactValidationError, validateContact(), buildSlackPayload(), submitContactForm(), main() CLI
2. **scripts/test-contact.ts** - NEW: Live end-to-end test + validation rejection test
3. **package.json** - EXISTING: Already had correct ESM setup, tsx, typescript, @types/node
4. **README.md** - EXISTING: Already had comprehensive setup documentation

## Verification Results (Final)
✓ AC1: submitContactForm(valid) posts Block Kit to Slack, returns { status: 200, body: "ok" }
✓ AC2: npm run test:contact performs real Slack send, prints PASS, exits 0
✓ AC3: validateContact rejects blank fields/invalid email with ContactValidationError (all issues collected)
✓ AC4: With SLACK_URL unset, test exits 1 with clear message
✓ AC5: Invalid webhook causes test to exit 1 with error logged (not URL)
✓ AC6: Webhook URL never printed (only status/body/message in error messages)
✓ AC7: Block Kit message with header+fields+section, user input escaped (&<>)
✓ AC8: No runtime npm dependencies, scripts run via tsx
✓ AC9: README.md documents setup, usage, and all commands
✓ Typecheck: PASS (zero TypeScript errors)

## Implementation Summary
- Created scripts/contact.ts with ContactInput, ContactValidationError, validateContact(), buildSlackPayload(), submitContactForm(), main()
- Created scripts/test-contact.ts with live Slack send test + validation rejection test
- Verified package.json already configured with ESM, tsx, typescript, @types/node
- README.md already had comprehensive setup documentation
- All acceptance criteria met, all tests pass

## MISSION COMPLETE
- Plan fully implemented
- All tests passing
- No errors or warnings
- Ready for production
