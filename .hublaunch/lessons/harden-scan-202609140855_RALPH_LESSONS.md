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

## Follow-up: harness passes `-- --concurrency=2` to `pnpm check`, breaks tsc (2026-09-14)
- Root cause: the harness invokes `pnpm check -- --concurrency=2` (a flag meant
  for parallel test runners), and pnpm forwards everything after `--` straight
  onto the script's command line. Since `check` was `tsc --noEmit`, tsc received
  `tsc --noEmit -- --concurrency=2` and failed with TS5023 (unknown compiler
  option), even though there's no real type error in the codebase.
- Fix: replaced the `check` script with `node scripts/check.mjs`, a tiny wrapper
  that spawns `tsc --noEmit` with a fixed, hardcoded arg list and ignores
  whatever extra CLI args get forwarded to it. This makes `check` robust to any
  future harness flags (concurrency, reporters, etc.) without needing to know
  about them in advance.
- Verified: `pnpm check`, `pnpm check -- --concurrency=2`, and `pnpm typecheck`
  all exit 0 with zero errors.

## Follow-up: `pnpm check` command not found (2026-09-14)
- Root cause: this repo's ralph.md has no `RALPH_CHECK_COMMANDS` block (it was
  overwritten with the generic harden.md loop template by the prior harden
  commit, losing the project-specific `npm run typecheck` command that used to
  live there). `run_check_step` in ralph-run.sh falls back to literal `pnpm check`
  when that block is absent, and package.json only defined `typecheck`, not `check`.
- Fix: added a `"check": "tsc --noEmit"` script alias to package.json (same as
  `typecheck`). No ESLint config exists in this repo, so `check` is TS-only.
- Verified: `pnpm check` and `pnpm typecheck` both pass with zero errors/warnings.
- If this recurs, also consider restoring a `RALPH_CHECK_COMMANDS` block in
  ralph.md pointing at `npm run typecheck` so the harness doesn't depend on a
  `check` script existing at all.
