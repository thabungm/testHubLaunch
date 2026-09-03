# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status - FINAL VERIFICATION (2026-09-03)
- Phase: ✅ COMPLETE AND VERIFIED
- Last action: Re-verified on 2026-09-03 - all checks pass
- Blockers: None
- All 9 acceptance criteria met and tested
- Fresh verification: typecheck ✅, test:contact ✅ (both tests PASS, exit 0)

## Implementation Overview
**Contact Us → Slack Feature** - A headless TypeScript module that validates contact form submissions and posts them to Slack via Incoming Webhook.

### Files Implemented
1. **scripts/contact.ts** - Core module
   - Exports: ContactInput, ContactValidationError, validateContact(), buildSlackPayload(), submitContactForm()
   - Features: Email validation, Block Kit formatting, input escaping (&<>), URL cleanup (lines 69-76)
   - Direct-run guard: import.meta.url check for smoke test functionality

2. **scripts/test-contact.ts** - Live integration test
   - Test 1: Real Slack send with ISO timestamp (HTTP 200 assertion)
   - Test 2: Validation rejection without network call (4 issue fields)
   - Guard: SLACK_URL presence check with clear error message

3. **package.json** - Project config
   - Type: "module" (ESM)
   - Scripts: contact (smoke test), test:contact (live test), typecheck
   - Dev dependencies: tsx, typescript, @types/node

4. **README.md** - Complete documentation
   - Setup instructions with `.env` export
   - API documentation for all exported functions
   - Usage examples for both test modes

## Key Discoveries From Implementation
- SLACK_URL handling: Accepts environment variable with quotes and trailing comma, cleaned by lines 69-76
- Node compatibility: Uses tsx (devDependency) for Node 20+, native TS stripping for Node 22.6+
- Block Kit structure: Header (150 char) + Name/Email fields + Message section (2900 char truncated)
- Validation: Collects ALL issues before throwing, ensures no Slack send on invalid input
- Escape handling: &<> characters properly escaped to prevent rendering issues

## Verification Results (2026-09-03 Final)
```
npm run typecheck: ✅ PASS (zero errors/warnings)
npm run test:contact: ✅ PASS
  - PASS (live send): HTTP 200, body: ok
  - PASS (validation): rejected 4 invalid fields
  - ALL PASS exit(0)
```

### Acceptance Criteria - ALL MET
✅ AC1: submitContactForm posts Block Kit to Slack (HTTP 200, body "ok")
✅ AC2: test:contact performs real Slack send, prints PASS (live send), exits 0
✅ AC3: validateContact rejects invalid input (ContactValidationError), no Slack call on invalid
✅ AC4: Missing SLACK_URL causes exit 1 with clear message
✅ AC5: Non-200 response causes exit 1 with status logged
✅ AC6: Webhook URL never printed to stdout/stderr
✅ AC7: Block Kit message with proper &<> escaping
✅ AC8: No runtime npm dependencies (only devDependencies)
✅ AC9: README.md documents setup and usage

## Technical Details
- **Runtime**: Node v24.11.1 in container (uses tsx for TypeScript)
- **Dependencies**: Zero runtime, tsx/typescript/types as devDependencies
- **Slack Integration**: Incoming Webhook URL, Block Kit payload, JSON POST
- **Validation**: Email regex `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`, all fields required
- **Error Handling**: ContactValidationError for bad input, clear stderr messages, non-zero exit codes

## Solutions That Work
- URL cleanup: Handles quoted, comma-suffixed format from HubLaunch environment
- Block Kit payload: Follows Slack schema exactly (header/section/fields structure)
- Validation-first design: Validates before any network call, collects all issues
- Direct-run pattern: import.meta.url check allows both direct execution and module import
- Test isolation: Validation test uses fake input, no network dependency

## Things to Avoid
- Do NOT modify URL processing logic (lines 69-76 contact.ts) - correctly handles environment format
- Do NOT add axios/node-fetch/dotenv dependencies - global fetch is sufficient
- Do NOT hard-code webhook URL - always read from SLACK_URL env var
- Do NOT send to Slack on validation failure - must validate first
- Do NOT print URL to logs - only log status/body/error messages

## Next Steps
✅ MISSION COMPLETE - Feature fully implemented, tested, verified
- All 9 acceptance criteria met
- Type-check passes
- Live test passes
- No remaining work required
