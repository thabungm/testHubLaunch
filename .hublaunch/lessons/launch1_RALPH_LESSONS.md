# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✅
- Last action: Implemented full plan (Next.js landing + contact + Slack notify), all tests/build pass, verified runtime.
- Blockers: None

## Key Discoveries
- Node in this worktree is v20.20.2 (plan said v24; both satisfy Next.js 15's >=18.18).
- No `.env` exists in this worktree (plan assumed one). Automated tests mock fetch so they don't need it; the 502-on-missing-SLACK_URL path was verified by running the prod server with SLACK_URL unset.
- Original `.gitignore` did NOT ignore `node_modules/`, `.next/`, or `next-env.d.ts` — added standard Next.js ignore entries. `.env` was already ignored.
- Installed versions: next 15.5.20, react 19.2.7, vitest 2.1.9.

## Solutions That Worked
- Verified secret isolation (AC4): `grep -rl SLACK_URL .next/static` -> not found in client bundle.
- End-to-end happy path (AC3): ran a tiny local mock HTTP server returning literal "ok", set SLACK_URL to it, POSTed /api/contact -> got `{"ok":true}` 200 and the mock received the exact formatted payload.
- Runtime API checks: 400 on empty fields, 400 on invalid JSON, 502 on valid input w/ SLACK_URL unset, 200 happy path — all confirmed via curl against `next start`.
- When killing background servers, capture PIDs (`NP=$!`) and `kill $NP`.

## Things to Avoid
- Don't use broad `pkill -f "next start"` in the same Bash call; it can terminate the tool shell (saw exit 144). Use tracked PIDs instead.

## Files Modified / Created
- package.json, tsconfig.json, next.config.ts, vitest.config.ts, .env.example, README.md
- src/lib/slack.ts, src/lib/slack.test.ts
- src/app/layout.tsx, src/app/page.tsx, src/app/contact/page.tsx, src/app/api/contact/route.ts
- .gitignore (added Next.js/Node ignores)

## Verification Results
- `npm test` -> 6/6 pass (fetch mocked, no network).
- `npm run build` -> compiles, lint+typecheck pass, 0 errors.
- All 8 acceptance criteria (AC1–AC8) verified.

## Next Steps
- None. Plan is 100% complete. (Manual live-Slack happy path needs a real SLACK_URL in `.env`, out of scope for automated verification.)
