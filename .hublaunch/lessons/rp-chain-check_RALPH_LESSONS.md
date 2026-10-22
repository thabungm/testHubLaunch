# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✅
- Last action: Implemented optional `phone` field; all checks + tests pass.
- Blockers: None

## Key Discoveries
- Dependencies are NOT pre-installed — run `npm install` first (adds tsx, typescript, @types/node). `tsc` is not on PATH until then.
- `SLACK_URL` is set in the environment, so the live Test 1 runs (real Slack send).
- Verification commands: `npm run typecheck` (strict tsc --noEmit), `npm run build` (node scripts/build.mjs), `npm run test:contact`.

## Solutions That Worked
- Followed the plan verbatim. Added `phone?: string` to ContactInput, `PHONE_RE = /^\+\d{8,15}$/`, conditional validation (`if (phone && !PHONE_RE.test(phone))`), and conditional Slack field push after Email.
- Extracted `fields` into a typed local `{ type: "mrkdwn"; text: string }[]` to keep the literal type under strict mode.
- Tests 3-6 added network-free; cast buildSlackPayload return to `{ blocks: { fields?: { text: string }[] }[] }` for navigation.

## Things to Avoid
- N/A

## Files Modified
- scripts/contact.ts — interface + PHONE_RE + validateContact + buildSlackPayload + main() sample phone
- scripts/test-contact.ts — import buildSlackPayload + Tests 3-6
- README.md — intro field list + API section

## Next Steps
- Done. All 9 acceptance criteria met; typecheck/build pass; `ALL PASS` printed.
