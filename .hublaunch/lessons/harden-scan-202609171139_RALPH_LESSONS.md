# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✅
- Task: Security audit of `.` (OUTCOME_TYPE=pr). Harden agent loop per harden.md.
- Result: PR #273 opened — https://github.com/thabungm/testHubLaunch/pull/273
  Commit 6dce82d on branch harden-scan-202609171139.
- Blockers: None

## Solutions That Worked (final)
- Fix in scripts/contact.ts: added resolveSlackUrl() enforcing https: scheme +
  10s AbortSignal.timeout on fetch. `npm run typecheck` passes; `npm audit` = 0 vulns.
- To run TS with top-level await for ad-hoc checks: write a .mts file and `npx tsx file.mts`
  (the `tsx -e` inline mode uses CJS and rejects top-level await).
- Excluded pre-existing `ralph.md` change (HubLaunch-managed) and the lessons file
  from the security PR — committed only scripts/contact.ts.

## Key Discoveries
- Real app code = the "Contact Us → Slack" feature: `scripts/contact.ts`,
  `scripts/test-contact.ts`, `scripts/build.mjs`. Everything else
  (ralph-run.sh, .github/*, .claude/*, .hublaunch/*) is HubLaunch tooling — out of scope.
- `npm audit` => 0 vulnerabilities. No runtime deps (uses global fetch).
- User input (name/email/subject/body) is escaped for Slack via esc() (& < >) in correct order.
  Slack mrkdwn injection (`<!channel>`, `<link|text>`) is blocked because `<` is escaped. Good.
- Email regex is safe (no ReDoS).

## Findings
- MEDIUM: `submitContactForm` POSTs to `SLACK_URL` without validating scheme/URL.
  A misconfigured/attacker-influenced env could send the *secret webhook* over cleartext
  http:// or to arbitrary schemes (file:, etc). Fix: require a valid https: URL.
- LOW: fetch() has no timeout — a hanging Slack endpoint blocks indefinitely (availability).
  Fix: AbortSignal.timeout.
- LOW/INFO: build.mjs uses spawnSync(..., {shell:true}) with static args — not exploitable
  (no user input), left as-is to avoid breaking the build.

## Solutions That Worked
- (pending)

## Things to Avoid
- Don't enforce a Slack-host allowlist that could break mock/local testing; enforce https scheme only.

## Files Modified
- scripts/contact.ts (planned)

## Next Steps
1. Add https URL validation + fetch timeout to scripts/contact.ts.
2. Run `npm run typecheck`. Ensure passes.
3. Open PR titled `harden: security audit . (2026-09-17)`.

## check-loop note (2026-09-17)
- `pnpm check` is not a defined script in package.json (only `contact`,
  `test:contact`, `typecheck`, `build`), and there's no pnpm-workspace.yaml —
  it's a single-package repo. pnpm's own "did you mean" suggestion of
  `pnpm typecheck` is correct; use that instead of `pnpm check`.
- No ESLint config exists in the repo (no .eslintrc*, no eslint devDependency),
  so there are no lint warnings to produce or fix.
- Ran `pnpm typecheck` (tsc --noEmit, strict mode): zero errors, zero warnings.
  Working tree was already clean at HEAD (e244c05). Nothing needed fixing.
