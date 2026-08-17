# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✅
- Last action: Verified all acceptance criteria
- Blockers: None

## Key Discoveries
1. SLACK_URL environment variable includes literal quotes and trailing comma when exported from JSON context
   - Solution: Strip quotes and commas with regex: `url.replace(/^["']|["'],?$/g, "")`
2. Node v20.20.2 in this environment requires `tsx` for `.ts` file execution (< v22 for native stripping)
3. Package.json already existed with correct structure using tsx

## Solutions That Worked
1. URL normalization: Handle JSON-quoted SLACK_URL with regex stripping
2. Block Kit payload structure follows exact schema expected by Slack API
3. Field validation collects ALL issues before throwing (no early exit on first error)
4. Using `import.meta.url === \`file://${process.argv[1]}\`` for direct-run detection works perfectly
5. Live test with `new Date().toISOString()` for unique subject identification in Slack

## Things to Avoid
1. Do NOT assume SLACK_URL is a plain URL - it may come with JSON quotes
2. Do NOT stop validation at first error - must collect all issues for user feedback
3. Do NOT send to Slack when validation fails - validate first, then send

## Files Modified
- `/workspace/scripts/contact.ts` - NEW: Core module with validation, Block Kit builder, sender
- `/workspace/scripts/test-contact.ts` - NEW: Live test harness
- `/workspace/package.json` - Already correct (no changes needed)
- `/workspace/README.md` - Already complete (no changes needed)

## All Acceptance Criteria Verified ✅
- AC1: submitContactForm posts Block Kit to Slack ✓
- AC2: test:contact performs real Slack send ✓
- AC3: validateContact rejects invalid input without sending ✓
- AC4: Missing SLACK_URL handled gracefully ✓
- AC5: Type-check passes ✓
- AC6: Webhook URL never printed ✓
- AC7: Block Kit with proper escaping ✓
- AC8: No runtime dependencies ✓
- AC9: README documents setup ✓

## Test Results
- `npm run typecheck`: PASS (zero errors)
- `npm run test:contact`: PASS (live send + validation)
- `npm run contact`: PASS (smoke test)

## Implementation Details

### scripts/contact.ts
- Exports: ContactInput (interface), ContactValidationError (class), validateContact, buildSlackPayload, submitContactForm
- Key features:
  - Email validation: `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`
  - Collects ALL validation issues before throwing (no early exit)
  - Block Kit payload with header (emoji + subject), Name/Email fields, Message section
  - Text escaping: `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`
  - Truncation: header to 150 chars, body to 2900 chars
  - Direct-run guard for CLI smoke testing
  - URL normalization handles JSON-quoted SLACK_URL: `url.replace(/^["']|["'],?$/g, "")`

### scripts/test-contact.ts
- Live happy-path test: real Slack send, asserts HTTP 200
- Validation test: rejects all-blank input with ≥4 issues
- ISO timestamp in subject for test identification in Slack

### Edge cases handled
1. SLACK_URL with JSON quotes/comma: normalized via regex
2. Whitespace-only fields: treated as empty via trim()
3. Long fields: truncated to Slack limits
4. Special characters: HTML-escaped in payload
5. Network failures: propagate to caller
6. Non-200 Slack response: returned in result, test/CLI exits 1

## Next Steps
- ✅ MISSION COMPLETE - All acceptance criteria verified
- Ready for commit and merge to main
