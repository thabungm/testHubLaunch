# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE - All features implemented and tested
- Last action: Verified all tests pass, README exists and is comprehensive
- Blockers: None

## Key Discoveries
- package.json already exists with "type": "module" and correct scripts using tsx
- scripts/ directory exists but only contained build.mjs initially
- SLACK_URL environment variable had JSON-like formatting with quotes and trailing comma
- Needed to strip quotes/commas from SLACK_URL: `.replace(/^['"]+|['",]*$/g, "")`
- README.md already existed with comprehensive documentation

## Solutions That Worked
- Updated submitContactForm to clean SLACK_URL: `process.env.SLACK_URL?.trim().replace(/^['"]+|['",]*$/g, "")`
- This fixed the "Failed to parse URL" error
- All three verification methods now pass:
  1. `npm run contact` - manual smoke test (sends sample to Slack, exits 0)
  2. `npm run test:contact` - live test + validation test (both pass)
  3. `npm run typecheck` - TypeScript type checking (zero errors)

## Things to Avoid
- Don't assume SLACK_URL is clean - it may have JSON-like formatting from environment
- Need to strip both quotes and trailing commas when cleaning the URL

## Files Modified
- .hublaunch/lessons/retry-test-contact-slack-2_RALPH_LESSONS.md (updated throughout session)
- scripts/contact.ts (created - validation, Block Kit builder, sender, main guard)
- scripts/test-contact.ts (created - live test + validation test)

## Open Questions
<!-- None - feature is complete -->

## Acceptance Criteria - ALL MET ✓

- AC1: ✓ submitContactForm posts Block Kit message, resolves with {status: 200, body: "ok"}
- AC2: ✓ npm run test:contact performs real Slack send, prints "PASS (live send): HTTP 200", exits 0
- AC3: ✓ validateContact rejects invalid fields with ContactValidationError, no Slack call
- AC4: ✓ With SLACK_URL unset, throws/exits 1 with clear message
- AC5: ✓ Non-200 response causes exit 1 with status logged
- AC6: ✓ SLACK_URL never printed to stdout/stderr
- AC7: ✓ Block Kit format with 1 header + 2 sections, escapes &<> in user input
- AC8: ✓ No runtime npm dependencies, dev-only (tsx, typescript, @types/node)
- AC9: ✓ README.md comprehensive (85 lines)

## Completion Summary

**FEATURE COMPLETE - ALL TESTS PASSING**

Created two new files:
- scripts/contact.ts (100 lines) - validation, Block Kit builder, sender, CLI smoke test
- scripts/test-contact.ts (43 lines) - live test + validation test

Key implementation details:
- Email regex: /^[^@\s]+@[^@\s]+\.[^@\s]+$/
- Validation collects ALL issues before throwing
- SLACK_URL cleaned: .replace(/^['"]+|['",]*$/g, "")
- Block Kit: header (150 char limit) + Name/Email fields + Message section (2900 char limit)
- User input escaped for Slack: & < >
- Direct-run guard: if (import.meta.url === `file://${process.argv[1]}`)

Verification results:
✓ npm run typecheck - TypeScript strict mode passes
✓ npm run test:contact - Live test + validation test PASS
✓ npm run contact - Manual smoke test PASS
✓ Git commit successful
