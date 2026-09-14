# HubLaunch Lessons Learned

## Current Status
- Phase: COMPLETE
- Mode: OUTCOME_TYPE=feedback → report to stdout, NO PR, NO code changes
- Last action: Wrote security audit report to stdout

## Key Discoveries
- App under audit is tiny: scripts/contact.ts (validate + build Slack payload + POST),
  scripts/test-contact.ts, scripts/build.mjs. No HTTP server, no DB, no auth.
- .github/scripts/* and .agents/* are bundled HubLaunch infra, not the app — excluded from focus.
- `npm audit`: 0 vulnerabilities. No committed secrets. `.env` gitignored + untracked.
- `npm run typecheck` (tsc --noEmit) passes cleanly after `npm install`.
- tsc not on PATH until deps installed — run `npm install` first.

## Findings (all Low/Informational — no critical/high)
1. SSRF via unvalidated SLACK_URL (Low, defense-in-depth): submitContactForm POSTs
   arbitrary JSON to whatever SLACK_URL points to; no https/host allowlist. Operator-set env.
2. Slack mrkdwn injection (Info): esc() escapes &,<,> — blocks link injection; residual
   *,_,` is cosmetic only. Adequate.
3. build.mjs uses spawnSync(..., {shell:true}) with fully static args — not exploitable,
   but shell:true is unnecessary. Info.

## Next Steps
- None. Feedback-mode audit delivered.
