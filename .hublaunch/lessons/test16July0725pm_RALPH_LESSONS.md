# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✅
- Plan: 2026-07-08 contact-us-landing-slack-notify (Next.js 15 web app)
- Last action: Implemented full Next.js app, all tests/build/typecheck pass, runtime-verified all routes.
- Blockers: None

## Key Discoveries
- Node here is **v20.20.2**, not v24 as the plan claimed. v20 still satisfies Next.js ≥18.18 — fine.
- **No `.env` file exists** in this worktree (plan assumed one). `.env.example` created; runtime testing used an env-injected SLACK_URL + a local mock Slack server.
- A **prior CLI-script contact feature** was already merged (`scripts/contact.ts`, `scripts/test-contact.ts`) using a Block Kit payload with a `name` field. The plan wanted a *different* Next.js web app — implemented that additively, kept the scripts working.
- npm registry IS reachable in this sandbox; Next.js 15.5.20 + React 19.2.7 + Vitest 2.1.9 installed fine.

## Solutions That Worked
- **`"type": "module"` MUST stay in package.json**: the legacy `scripts/*.ts` use top-level `await`, which tsx/esbuild rejects under CJS ("Top-level await not supported with cjs output"). Next.js 15 builds fine WITH `type: module`, so keep it.
- **Two tsconfigs**: root `tsconfig.json` = standard Next.js config (checks `src/`, excludes `scripts/`); `tsconfig.scripts.json` keeps the legacy scripts' `allowImportingTsExtensions`/`verbatimModuleSyntax` settings. `typecheck` runs both.
- **Runtime verification**: `npx next start`, a tiny node mock returning `ok` on :4001 as SLACK_URL, curl each route. Verified 200/400/502 paths + Slack payload formatting.
- To reliably free port 3000 between test runs use `pkill -9 -f next-server` and wait; `next start` spawns a child so plain `%1` kills miss it. Use `setsid ... & disown` to detach.

## Things to Avoid
- Do NOT remove `"type": "module"` (breaks legacy scripts — see above).
- Do NOT include `scripts/` in the Next tsconfig (their `.ts` extension imports fail under Next's config).

## Files Modified / Created
- Modified: package.json, tsconfig.json, .gitignore, README.md, package-lock.json
- Created: next.config.ts, vitest.config.ts, tsconfig.scripts.json, .env.example
- Created: src/lib/slack.ts, src/lib/slack.test.ts
- Created: src/app/layout.tsx, src/app/page.tsx, src/app/contact/page.tsx, src/app/api/contact/route.ts

## Verification (all PASS)
- `npm test` → 6/6 pass (mocked fetch)
- `npm run typecheck` → 0 errors (both tsconfigs)
- `npm run build` → compiles, routes /, /contact, /api/contact
- Runtime: / has "coming soon"; /contact has email/subject/body; POST valid→200 (Slack got formatted payload); missing fields→400; bad JSON→400; SLACK_URL unset→502 (no URL leaked in log)
- Secret check: SLACK_URL absent from `.next/static` client bundle; no `NEXT_PUBLIC_` usage.

## Next Steps
- Done. Optional: live happy-path send with a real SLACK_URL (needs a real webhook).
