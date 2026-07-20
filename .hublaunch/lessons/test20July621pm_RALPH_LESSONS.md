# HubLaunch Lessons Learned

## Current Status
- Phase: COMPLETE ✅
- Feature: Next.js 15 Landing + Contact Us page with Slack notification on submit.
- All checks green: `npm test` (6/6), `npm run typecheck` (0 errors), `npm run build` (0 errors).
- Runtime E2E verified: `/` and `/contact` render; POST /api/contact → 200 + real Slack "ok"
  on valid input, 400 on invalid JSON / missing fields, 502 on Slack failure.

## Key Discoveries
- Node v20.20.2 (plan said v24; ≥18.18 is fine for Next 15). Installed next@15.5.20, react@19.2.7, vitest@2.1.9.
- Repo previously had a DIFFERENT script-based contact impl (PR #110: scripts/contact.ts, 4 fields, Block Kit).
  The PLAN required a Next.js web app (3 fields, plain-text Slack msg). Implemented the PLAN; kept legacy scripts.
- **IMPORTANT ENV QUIRK**: this container forwards `SLACK_URL` wrapped in quotes + trailing comma
  (value = `"https://...",`), because it's a directly-forwarded process env var, NOT loaded via Next's
  dotenv (which would strip quotes). Raw `.trim()` → `fetch` "Failed to parse URL" → 502.
  FIX: sendSlackNotification strips surrounding quotes/commas/whitespace:
  `process.env.SLACK_URL?.trim().replace(/^['"]+|['",\s]+$/g, "")`. Clean URLs unaffected; all unit tests pass.

## Solutions That Worked
- Wrote Next.js files by hand (no create-next-app). tsconfig maps @/* -> src/*, excludes scripts/.
- Removed "type":"module" from package.json (Next handles ESM); kept tsx legacy script commands.
- Added .next/, next-env.d.ts, tsconfig.tsbuildinfo to .gitignore.
- To restart server cleanly: pkill/kill -9 next-server, then start via background task, wait for curl 200.

## Things to Avoid
- Don't read SLACK_URL in client code / NEXT_PUBLIC_. Verified no leak in .next/static.
- Old `next start` process lingers after rebuild — must kill it before re-testing or you test stale code.
- `pkill -f "next start"` inside a compound Bash command sometimes returned exit 144; kill by PID instead.

## Files Created/Modified
- NEW: src/lib/slack.ts, src/lib/slack.test.ts, src/app/layout.tsx, src/app/page.tsx,
  src/app/contact/page.tsx, src/app/api/contact/route.ts, next.config.ts, vitest.config.ts, .env.example
- MODIFIED: package.json (Next+vitest deps/scripts), tsconfig.json (Next standard), .gitignore, README.md
- Legacy (unchanged): scripts/contact.ts, scripts/test-contact.ts

## Next Steps
- Done. All acceptance criteria met. Ready to commit.
