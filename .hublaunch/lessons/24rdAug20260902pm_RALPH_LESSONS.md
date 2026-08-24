# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✓
- Last action: All tests passing, implementation complete
- Blockers: None

## Key Discoveries
- SLACK_URL in the HubLaunch container is JSON-encoded with a trailing comma: `"https://...","` 
- The URL needs special parsing to handle the JSON encoding before use
- Contact feature successfully sends real Slack messages via Incoming Webhook

## Solutions That Worked
- JSON.parse() with comma-stripping handles the SLACK_URL format correctly
- Node v24 native type-stripping works seamlessly with `.ts` files
- Slack Block Kit format requires exact structure; escaping of &/<> is critical
- Live tests (actual Slack sends) work reliably with HTTP 200 + body "ok" assertion

## Things to Avoid
- Don't assume SLACK_URL is plain text - handle JSON encoding and trailing commas
- Don't skip the escaping step for user input - Slack requires &/</> escaping
- Don't mock the Slack call in happy-path tests - real sends are essential for validation

## Files Modified
- Created: `scripts/contact.ts` (validation + Block Kit builder + sender)
- Created: `scripts/test-contact.ts` (live e2e test)
- Modified: (None - package.json and README.md already existed)
- Type-check: PASS (npm run typecheck)
- Tests: PASS (npm run test:contact - both live send and validation tests)

## Open Questions
- None

## Next Steps
- Implementation is complete and all acceptance criteria met
- Ready for production use
