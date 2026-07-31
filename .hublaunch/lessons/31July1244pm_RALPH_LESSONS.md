# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE - All implementation done and verified
- Last action: Completed all acceptance criteria
- Blockers: None

## Key Discoveries
- Node v20 is running, not v24 - requires tsx for TypeScript execution
- Invalid webhook URLs return HTTP 200 with HTML body (Slack redirect) - must check both status and body
- Existing package.json already had TypeScript setup and devDependencies in place

## Solutions That Worked
- Updated npm scripts to use tsx instead of node for TypeScript execution
- Test script checks both HTTP status (200) AND body ("ok") for proper validation
- sendSlackMessage exported as reusable function, main() runs only when executed directly
- Error handling properly logs to stderr and exits with code 1

## Things to Avoid
- Do not use node directly on Node < 22 for .ts files - must use tsx
- Original plan said test only checks status, but needed to verify body too for real Slack webhook validation

## Files Modified
- package.json - added "send" and "test:slack" npm scripts
- scripts/send-slack.ts - NEW - sender with exported function
- scripts/test-send-slack.ts - NEW - test harness
- README.md - added Welcome Message Script documentation section

## Open Questions
None

## Next Steps
Test with real SLACK_URL when available
