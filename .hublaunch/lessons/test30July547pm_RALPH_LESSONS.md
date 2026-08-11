# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✓
- Last action: Fixed production build failure (missing `build` script)
- Blockers: None

## Key Discoveries
- Implementation was already complete in scripts/contact.ts and scripts/test-contact.ts
- SLACK_URL in environment had extra quotes and trailing comma
- Fixed URL parsing to strip quotes and trailing commas
- This project is a headless TS scripts project (no bundler/web app) — `ralph.md`
  documents an intentionally empty `RALPH_BUILD_COMMANDS` block ("no build step").
- Deploy pipeline runs `pnpm build` unconditionally, but `package.json` had no
  `build` script at all, causing `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL: Command "build" not found`.

## Solutions That Worked
- Updated submitContactForm to handle quoted URLs: `url.replace(/^["']|["',]+$/g, "").trim()`
- Full Block Kit message structure with header, Name/Email fields, and Message section
- Validation collects all issues before any network call
- Live test actually sends to Slack and asserts HTTP 200
- CLI smoke test submits sample valid submission
- Added a `"build": "tsc --noEmit"` script to package.json — aliases build to the
  existing typecheck step since there's nothing to bundle/emit. Satisfies the
  deploy pipeline's `pnpm build` invocation without changing project behavior.

## Things to Avoid
- Don't assume environment URLs won't have quotes - always sanitize
- Don't assume every project needs a real bundling build step — but the deploy
  pipeline always calls `pnpm build`, so a `build` script must exist even if it
  just delegates to typecheck (or is a no-op) for build-only-verification projects.

## Files Modified
- scripts/contact.ts - FIXED URL parsing to handle quotes and trailing commas
- package.json - ADDED `build` script (`tsc --noEmit`) to fix
  `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL: Command "build" not found`

## Verification Results
- pnpm build: ✓ PASS (runs `tsc --noEmit`, zero errors)
- TypeScript type-check: ✓ PASS (zero errors/warnings)
- npm run test:contact: ✓ PASS (live send + validation tests)
- npm run contact: ✓ PASS (CLI smoke test)
- All acceptance criteria MET

## Implementation Complete
All 9 acceptance criteria verified:
- AC1: Valid submissions post to Slack with Block Kit
- AC2: Live test performs real Slack send, exits 0
- AC3: Validation rejects bad input, no Slack message sent
- AC4: Missing SLACK_URL handled correctly
- AC5: Non-200 responses logged correctly
- AC6: URL never printed to stdout/stderr
- AC7: Block Kit formatting with proper escaping
- AC8: No runtime deps, runs on Node v24
- AC9: README.md comprehensive documentation
