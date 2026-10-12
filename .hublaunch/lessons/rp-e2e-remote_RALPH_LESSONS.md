# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Implemented optional E.164 `phone` field end-to-end; all checks pass.
- Blockers: None

## Key Discoveries
- `tsc` is not on PATH until `npm install` runs (devDependencies). Run `npm install` first.
- `SLACK_URL` is forwarded into the container env (no `.env` file); Test 1 is a real live Slack send and returns HTTP 200 / body "ok".
- Verification commands: `npm run typecheck`, `npm run test:contact`, `npm run build` (build.mjs).

## Solutions That Worked
- Added `phone?: string` to `ContactInput` (after email).
- Added `PHONE_RE = /^\+\d{8,15}$/`; validate only when trimmed phone is non-empty.
- In `buildSlackPayload`, built an explicit typed `fields` array and conditionally pushed the Phone entry after Email. Explicit `{ type: "mrkdwn"; text: string }[]` annotation avoids literal widening under strict.
- Added Tests 3-5 (network-free) to test-contact.ts; imported `buildSlackPayload`.
- Updated README field list, ContactInput signature, and validate/build descriptions.

## Things to Avoid
- N/A

## Files Modified
- scripts/contact.ts
- scripts/test-contact.ts
- README.md

## Open Questions
- None

## Next Steps
- Done. All acceptance criteria met; typecheck clean; all 5 tests PASS.
