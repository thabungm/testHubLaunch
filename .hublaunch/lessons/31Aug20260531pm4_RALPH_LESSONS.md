# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: Implementation Complete - All Tests Passing
- Last action: Comprehensive validation and edge case testing
- Blockers: None

## Key Discoveries
1. SLACK_URL environment variable in HubLaunch container has trailing comma and quotes - needed defensive URL parsing
2. Node v20 in container requires `tsx` for TypeScript execution (not native v24 stripping)
3. Email validation regex `/^[^@\s]+@[^@\s]+\.[^@\s]+$/` correctly validates email format
4. Block Kit payload requires escaping of `&`, `<`, `>` to prevent malformed rendering
5. Body truncation to ~2900 chars is correct; total message section text is ~2911 chars (2900 + label)

## Solutions That Worked
1. **URL Parsing Fix**: Added defensive URL parsing to strip quotes and trailing comma:
   ```ts
   url = url.replace(/^["']/, "").replace(/["',]+$/, "");
   ```
   This makes the code resilient to improperly quoted environment variables.

2. **ESM Module Structure**: Using `import.meta.url` for direct-run guard works perfectly in ESM mode
3. **Live Testing with SLACK_URL**: Tests successfully post real messages to Slack webhook and assert HTTP 200
4. **No Runtime Dependencies**: Successfully using global `fetch` (Node 18+) with no npm dependencies beyond dev tools

## Things to Avoid
1. Do NOT use `dotenv` - the environment should be pre-exported by the caller
2. Do NOT mock SLACK_URL in the happy-path test - real send is required per AC2
3. Do NOT forget to trim SLACK_URL - it may have whitespace or quotes from environment

## Files Modified
- `/workspace/scripts/contact.ts` - NEW: Main module with validation, payload builder, and sender
- `/workspace/scripts/test-contact.ts` - NEW: Live test suite (real send + validation test)
- No changes to existing files; all additions are new

## Implementation Complete - All Acceptance Criteria Met
✓ AC1: submitContactForm posts Block Kit to Slack, resolves with { status: 200, body: "ok" }
✓ AC2: test-contact.ts performs real Slack send, prints "PASS (live send): HTTP 200", exits 0
✓ AC3: validateContact rejects invalid input with ContactValidationError, NO send on invalid
✓ AC4: Missing SLACK_URL throws/exits 1 with clear message
✓ AC5: Non-200 responses handled correctly (test would exit 1)
✓ AC6: Webhook URL never printed to stdout/stderr
✓ AC7: Uses Block Kit format with proper escaping of `&`, `<`, `>`
✓ AC8: No new runtime dependencies, uses Node native fetch
✓ AC9: README.md already documents usage

## Test Results Summary
- `npm run typecheck` - PASS (no TypeScript errors)
- `npm run test:contact` - PASS (live send HTTP 200, validation rejection 4 issues)
- `npm run contact` - PASS (CLI smoke test)
- Validation edge cases - ALL PASS
- Payload truncation/escaping - CORRECT
- Email regex validation - CORRECT

## Next Steps
- Stage and commit all changes
- Feature is ready for production
