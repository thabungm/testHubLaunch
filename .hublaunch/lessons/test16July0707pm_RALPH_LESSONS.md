# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✅ — Next.js Contact-Us web app implemented, tested, built.
- Last action: All checks green (test/typecheck/build), committing.
- Blockers: None.

## Key Discoveries
- Node is v20.20.2 (plan said v24). Fine: Next.js 15 needs >=18.18; global fetch present.
- NO `.env` in worktree -> no live Slack send possible. Mocked vitest + build cover the ACs.
- Prior DIFFERENT feature exists: scripts/contact.ts + test-contact.ts (4 fields, Block Kit).
  Kept intact & still typechecks. Plan implemented ADDITIVELY alongside it.
- Installed: next@15.5.20, react@19.2.7, react-dom@19.2.7, vitest@2.1.9, typescript@5.9.3.

## Solutions That Worked
- Merged package.json: kept `"type":"module"` + tsx scripts, added next/react/vitest + scripts.
- tsconfig: Next.js-standard (jsx preserve, @/* paths, next plugin) + include scripts/** so
  `tsc --noEmit` covers BOTH web app and scripts. Kept allowImportingTsExtensions for scripts.
  Dropped verbatimModuleSyntax (not needed; scripts still typecheck).
- Verified runtime via `next start` + curl: / and /contact render; /api/contact ->
  200{ok:true} valid, 400 missing/whitespace/invalid-JSON, 502 on Slack failure.
- formatSlackText output verified via tsx one-shot; matches plan template exactly.
- Secret checks: SLACK_URL absent from .next/static bundle; only read in src/lib/slack.ts.

## Things to Avoid
- Do NOT remove `"type":"module"` (breaks scripts/contact.ts top-level await).
- Background node stubs get reaped between Bash tool calls in this sandbox (exit 144);
  don't rely on long-lived background stubs — foreground checks are reliable.
- Do NOT pipe `pkill ...` combined with the real checks in one Bash call (yields exit 144).

## Files Modified / Created
- package.json (merged), tsconfig.json (Next.js+scripts), .gitignore (+.next/next-env)
- README.md (rewritten: web app primary + scripts section)
- NEW: next.config.ts, vitest.config.ts, .env.example
- NEW: src/app/layout.tsx, src/app/page.tsx, src/app/contact/page.tsx,
       src/app/api/contact/route.ts, src/lib/slack.ts, src/lib/slack.test.ts

## Next Steps
- Done. All acceptance criteria (AC1-AC8) met. Nothing outstanding.
