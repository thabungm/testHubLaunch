# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✅
- Last action: All tests passing, feature fully implemented
- Blockers: None

## Key Discoveries
- Plan requires: scripts/contact.ts (validation + Block Kit + sender), scripts/test-contact.ts (live tests), package.json (ESM + scripts), README.md
- Node v24.11.1 natively strips TypeScript, so no build needed - just run `.ts` files directly
- SLACK_URL already in .env and forwarded via hublaunch.config.js
- SLACK_URL had wrapping quotes and trailing comma in environment - needed regex cleanup: `replace(/^["']+|["',]+$/g, "")`
- Block Kit payload must match exact structure or Slack returns 400 invalid_blocks

## Solutions That Worked
- URL sanitization: `replace(/^["']+|["',]+$/g, "").trim()` handles quoted/comma-delimited env vars
- Validation-first approach: validate before any fetch, so invalid input never reaches Slack
- Block Kit structure: header (plain_text), section with fields (mrkdwn for Name/Email), section with mrkdwn for Message

## Things to Avoid
- Don't add axios, node-fetch, dotenv - Node 24 has global fetch
- Don't hard-code or echo the webhook URL
- Don't send to Slack when validation fails
- Don't mock Slack calls in happy-path test - real send required
- Don't forget to strip env var quotes/commas - these are common in CI/container environments

## Files Modified
- scripts/contact.ts (NEW) - Core validation, Block Kit builder, Slack sender, CLI smoke test
- scripts/test-contact.ts (NEW) - Live test and validation rejection test
- package.json (MERGED) - Already had proper ESM config and scripts
- README.md (VERIFIED) - Already complete and accurate

## Open Questions
None - all requirements met

## Next Steps
✓ MISSION COMPLETE - All acceptance criteria met:
  ✓ AC1: submitContactForm posts Block Kit and returns {status: 200, body: "ok"}
  ✓ AC2: npm run test:contact performs real Slack send, HTTP 200
  ✓ AC3: validateContact rejects invalid input before any network call
  ✓ AC4: Missing SLACK_URL handled gracefully
  ✓ AC5: Non-200 responses exit with status logged
  ✓ AC6: Webhook URL never printed
  ✓ AC7: Block Kit with escaping of &/</>
  ✓ AC8: No runtime npm deps, runs via tsx on Node v24
  ✓ AC9: README.md complete
  ✓ typecheck: zero errors
  ✓ test:contact: ALL PASS
  ✓ contact smoke test: HTTP 200
