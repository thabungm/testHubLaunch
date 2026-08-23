# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✓
- Last action: Implemented contact feature with full validation and Slack integration
- Blockers: None

## Key Discoveries
- Plan is comprehensive with detailed reference implementation
- Using Node v20.20.2 (not v24 as mentioned in plan comments), so tsx is required instead of native TS stripping
- SLACK_URL environment variable had extra quotes and trailing comma in the set value
- URL parsing fix: `url.replace(/^["']|["',]+$/g, "").trim()` handles malformed env vars
- Build.mjs wrapper script already exists to handle pnpm's extra args to deploy pipeline
- Package.json and scripts/ directory already existed from prior work
- README.md already had comprehensive documentation

## Solutions That Worked
- Updated submitContactForm to sanitize SLACK_URL with regex to strip quotes/commas
- Full Block Kit message structure (header + Name/Email fields + Message section)
- Validation collects all issues before any network call
- Live test actually sends to Slack and asserts HTTP 200
- CLI smoke test submits sample valid submission
- tsx wrapper needed for Node v20 (which doesn't have native TS type-stripping)

## Things to Avoid
- Don't assume environment URLs won't have quotes/malformed data - always sanitize
- Don't assume every project uses Node v24+ for native TS support - check actual runtime version
- Node v20 requires tsx for running .ts files directly

## Files Modified
- scripts/contact.ts - CREATED with full implementation + URL sanitization fix
- scripts/test-contact.ts - CREATED with live send test + validation test
- package.json - UPDATED scripts to use tsx (from node) for Node v20 compatibility

## Verification Results
✓ npm run typecheck - PASS (zero errors/warnings)
✓ npm run contact - PASS (CLI smoke test, submitted to Slack successfully)
✓ npm run test:contact - PASS (live send + validation tests both pass)
✓ npm run build - PASS (build wrapper executes without error)

## Acceptance Criteria Met
- AC1: ✓ submitContactForm posts valid submissions to Slack with Block Kit, returns HTTP 200
- AC2: ✓ test-contact performs real Slack send, prints PASS, exits 0
- AC3: ✓ validateContact rejects invalid input with all issues, no Slack message sent
- AC4: ✓ With SLACK_URL unset, test exits 1 with error message
- AC5: ✓ Non-200 responses properly handled and logged
- AC6: ✓ SLACK_URL never logged (only status/body)
- AC7: ✓ Block Kit format with proper escaping of &, <, >
- AC8: ✓ No runtime dependencies, runs with tsx on Node v20
- AC9: ✓ README.md comprehensive documentation provided

## Implementation Complete
All requirements implemented and tested successfully.
