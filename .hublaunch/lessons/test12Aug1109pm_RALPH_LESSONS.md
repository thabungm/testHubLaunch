# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: All verification tests passed
- Blockers: None

## Key Discoveries
- SLACK_URL environment variable includes quotes and trailing comma from config, needs robust stripping
- The `contact.ts` module uses regex-based quote/comma stripping: `/^["']|["',]+$/g`
- Used this same approach in health.ts for consistency
- Slack webhook responds with HTTP 400 + "invalid_payload" for empty POST (non-intrusive probe)
- Slack responds with HTTP 404 + "no_service" for revoked/invalid webhooks

## Solutions That Worked
- Implemented cleanSlackUrl() helper function to strip quotes/commas from SLACK_URL (mirrors contact.ts)
- Used AbortSignal.timeout(timeoutMs) for network calls - clean API
- Used performance.now() for latency measurement
- Separated config check (pure, no network) from reachability check (network probe)
- HTML rendering uses minimal inline CSS, no external dependencies
- Test structure mirrors test-contact.ts exactly

## Things to Avoid
- Don't forget to clean SLACK_URL of quotes/commas before using in network calls
- Never include the actual token path in URLs displayed or logged

## Files Modified
- /workspace/scripts/health.ts (new) - Core health check module with types, functions, CLI
- /workspace/scripts/test-health.ts (new) - Test suite
- /workspace/package.json - Added "health" and "test:health" scripts
- /workspace/README.md - Added Health Check section with usage docs

## Tests Passed
- npm run typecheck - PASS (zero errors, strict mode)
- npm run health - PASS (exit code 0, correct output format)
- npm run health -- --html - PASS (generates health.html, no token leaked)
- npm run health -- --live - PASS (sends message, adds live check)
- npm run health -- --timeout=3000 - PASS (custom timeout works)
- env -u SLACK_URL npm run health - PASS (exit code 1 when unset)
- SLACK_URL="https://hooks.slack.com/services/T000/B000/fake" npm run health - PASS (detects revoked webhook, exit 1)
- npm run test:health - PASS (all 4 tests pass)
- npm run test:contact - PASS (no regression)

## Acceptance Criteria Met
- [x] AC1: npm run health prints report showing config and reachability, exits 0, no message posted
- [x] AC2: With SLACK_URL unset, reports config failed, skips network checks, exits 1
- [x] AC3: With revoked webhook, reports reachability failed, exits 1
- [x] AC4: --html writes self-contained health.html, no token visible
- [x] AC5: --live sends real ping, live check passes, documented as channel-visible
- [x] AC6: test:health prints ALL PASS, exits 0
- [x] AC7: typecheck passes with zero errors (strict mode)
- [x] AC8: SLACK_URL never appears in output, HTML, or error messages
- [x] AC9: No new runtime dependencies, contact.ts unchanged
