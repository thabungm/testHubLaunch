# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: Implementation Complete & Verified
- Last action: All tests passing (typecheck, test:contact, contact smoke test)
- Blockers: None

## Key Discoveries
- SLACK_URL environment variable was being set with extra quotes and trailing comma: `"https://...","` 
  - Required regex cleanup: `/^["']+|["',]+$/g` to strip quotes and trailing comma/quotes
- Slack Incoming Webhook correctly returns HTTP 200 with body "ok" after fix
- Block Kit formatting in the Slack message sends successfully

## Solutions That Worked
- URL sanitization regex: `url.replace(/^["']+|["',]+$/g, "")` handles quoted and comma-suffixed URLs
- Using tsx for Node.js TypeScript execution (works on any Node >= 18)
- Direct ESM import with `.ts` extension for relative imports
- Contact validation collects all issues before throwing (doesn't stop on first error)

## Things to Avoid
- Don't assume SLACK_URL environment variable is clean - may contain quotes/commas from config
- Don't check only response body for validation - Slack webhook returns "ok", but need to verify HTTP 200 status first

## Files Modified
- scripts/contact.ts - Created: validation, payload builder, sender, direct-run main()
- scripts/test-contact.ts - Created: live test (real Slack send) + validation test
- scripts/contact.ts (modified): Added URL sanitization for malformed SLACK_URL env var

## Open Questions
None - all requirements met and verified.

## Next Steps
Commit changes to branch.
