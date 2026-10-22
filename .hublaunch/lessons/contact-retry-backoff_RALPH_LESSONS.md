# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Implemented retry-with-exponential-backoff feature for Contact form Slack sends
- Blockers: None

## Key Discoveries
- The plan was well-structured and all requirements were clear
- Two environment variable parsing helpers needed (one for positive ints, one for non-negative ints) for the two retry env vars
- The retry test needed to stub globalThis.fetch with fast backoff timing (10ms) to keep test execution fast

## Solutions That Worked
- parsePositiveIntEnv/parseNonNegativeIntEnv helper functions for graceful env var parsing with fallbacks
- Global fetch stubbing in Test 3 with callCount to verify exactly 3 attempts
- Exponential backoff calculation: baseDelayMs * 2^(attempt-1)
- Retry logic: only retries on 429, 5xx, or thrown errors; returns immediately on all other statuses

## Things to Avoid
- Don't use a runtime npm dependency for retry logic - keep it simple and inline
- Don't add parameters to submitContactForm() - use environment variables instead for backwards compatibility
- Don't retry validation errors - they should never trigger a network call

## Files Modified
- scripts/contact.ts: Added parsePositiveIntEnv/parseNonNegativeIntEnv helpers and retry loop to submitContactForm()
- scripts/test-contact.ts: Added Test 3 (retry) with stubbed fetch that fails twice with 503, succeeds on 3rd attempt
- README.md: Added "## Retry behavior" section documenting the feature and env vars

## Test Results
✓ npm run typecheck: PASS (no errors)
✓ npm run test:contact: PASS
  - Test 1 (live send): PASS - HTTP 200 to real Slack
  - Test 2 (validation): PASS - rejected 4 invalid fields
  - Test 3 (retry): PASS - succeeded on attempt 3 after 2 retryable 503 failures
✓ npm run contact: PASS - smoke test shows no delays on successful first attempt

## Open Questions
None

## Next Steps
Complete - all acceptance criteria met
