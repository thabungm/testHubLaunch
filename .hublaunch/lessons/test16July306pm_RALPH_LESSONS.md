# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: ✅ COMPLETE. Next.js app implemented, tested, built, verified.
- Last action: All checks pass; committing.
- Blockers: None.

## Key Discoveries
- Repo already had a DIFFERENT contact feature (merged PR #110): headless
  `scripts/contact.ts` + `scripts/test-contact.ts` (4-field Block Kit sender).
  Kept those UNTOUCHED. My plan = a Next.js 15 App Router web app (3 fields).
- Node v20.20.2. Installed next@15.5.20, react/react-dom@19.2, vitest@2.1.9.
- MERGE strategy for package.json + tsconfig.json worked: one tsconfig serves
  both Next.js (jsx/paths/@ alias) AND the existing scripts
  (allowImportingTsExtensions + verbatimModuleSyntax). `npm run typecheck`
  (tsc --noEmit over whole repo) passes for both.

## Solutions That Worked
- Kept `"type": "module"` in package.json — Next.js 15 + next.config.ts is fine.
- Typed the form submit handler as `FormEvent` (import type from react) instead
  of the plan's `React.FormEvent` — avoids "React refers to a UMD global" error
  under verbatimModuleSyntax (no React import in the file).
- Background processes: `(cmd &)` subshells get reaped when the Bash tool call
  ends. Use the Bash tool's `run_in_background: true` instead — that persists.
- End-to-end verified with a local mock Slack server (returns "ok"): POST
  /api/contact -> 200 {"ok":true}; mock received exact plan payload.

## Verification Results (all PASS)
- `npm test` → 6/6 Vitest cases pass (fetch mocked).
- `npm run build` → compiles, lint + type check clean.
- `npm run typecheck` → exit 0.
- Runtime: `/` shows coming-soon+link; `/contact` has email/subject/body+Send;
  POST 400 (missing fields), 400 (bad JSON), 502 (no/failed Slack), 200 (happy).
- Security: no SLACK_URL/webhook in `.next/static` client bundle; SLACK_URL read
  only in src/lib/slack.ts; no NEXT_PUBLIC_ usage; .env untracked.

## Things to Avoid
- Do NOT delete scripts/contact.ts or test-contact.ts (existing merged feature).
- Do NOT read SLACK_URL in client code / NEXT_PUBLIC_ / log it.

## Files Modified / Created
- Modified: package.json, tsconfig.json, README.md (appended web-app section),
  .gitignore (ignore .next/, next-env.d.ts, *.tsbuildinfo).
- Created: next.config.ts, vitest.config.ts, .env.example,
  src/app/layout.tsx, src/app/page.tsx, src/app/contact/page.tsx,
  src/app/api/contact/route.ts, src/lib/slack.ts, src/lib/slack.test.ts.

## Next Steps
- Done. Commit the changes.
