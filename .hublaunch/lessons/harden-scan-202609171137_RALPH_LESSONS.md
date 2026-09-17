# HubLaunch Lessons Learned — Harden Security Audit

## Current Status
- Phase: COMPLETE — PR #272 opened (https://github.com/thabungm/testHubLaunch/pull/272)
- Outcome type: `pr` — must fix unambiguous high/critical issues + open PR
- Blockers: None

## Solutions That Worked
- Added `resolveSlackWebhookUrl()` to contact.ts: parses URL, requires `https:` +
  host `hooks.slack.com`, keeps existing quote/comma stripping. Rejects http/
  file:/bad-host/garbage. Added `AbortSignal.timeout(10s)` to the fetch.
- Verified via ad-hoc tsx test (7 cases all PASS), `npm run typecheck` clean,
  `npm audit` = 0 vulns.
- NOTE: pre-existing `M ralph.md` is HubLaunch runtime churn (not mine) — exclude
  from PR. Only commit `scripts/contact.ts`.

## Scope
The real application code is the "Contact Us → Slack" feature:
- `scripts/contact.ts` (core: validate + build payload + POST to SLACK_URL)
- `scripts/test-contact.ts` (live + validation tests)
- `scripts/build.mjs` (tsc wrapper)
- `package.json`, `tsconfig.json`

Everything under `.github/scripts/`, `.hublaunch/`, `.agents/`, `.claude/`,
`ralph-run.sh`, `harden.md`, `ralph.md` is HubLaunch infrastructure bundled by the
Hula team — DO NOT edit (header comment says so).

## Key Discoveries
- No hardcoded secrets in app code (grep for api_key/secret/token/etc = clean).
- `.env` is gitignored; no tracked env files. Good.
- `npm audit` = 0 vulnerabilities (no runtime deps anyway).
- Email regex is linear (no ReDoS).
- `esc()` escapes `& < >` — this is Slack's documented/complete message escaping. OK.

## Findings
1. **[Medium/High] SSRF + PII exfiltration via unvalidated `SLACK_URL`** —
   `submitContactForm` (contact.ts:65-87) POSTs the payload (contains user PII:
   name, email, message) to whatever `SLACK_URL` contains, with NO scheme/host
   validation. A misconfigured/tampered value could send PII to an arbitrary host
   or over plaintext `http://`, or use non-http schemes (`file:`/`ftp:` SSRF).
   FIX: parse URL, require `https:` and host `hooks.slack.com` (Slack incoming
   webhook format per README) before fetch.
2. **[Low] No request timeout on `fetch`** — a hung Slack endpoint hangs caller
   indefinitely (DoS/resource exhaustion). FIX: AbortController timeout.
3. **[Low/Non-issue] `shell: true` in build.mjs** — insecure default BUT command &
   args are hardcoded constants with zero user input → not exploitable. Removing
   risks breaking `tsc` PATH resolution. NOT fixing (avoid breaking build).

## Solutions That Worked
<!-- record as I go -->

## Files Modified
- scripts/contact.ts (planned: SLACK_URL validation + fetch timeout)

## Next Steps
- Implement fixes in contact.ts, run typecheck, open PR.

## Follow-up: `pnpm check` not found (2026-09-17)
- Harness invoked `pnpm check`, but `package.json` only defined `typecheck`
  (no `check` script) — pnpm's recursive-exec failed before any TS/ESLint
  code was even run (`ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`).
- Not a code bug: `pnpm typecheck` (`tsc --noEmit`) was already clean, and
  there is no ESLint config/devDependency in this repo at all.
- FIX: added `"check": "tsc --noEmit"` alongside `"typecheck"` in
  `package.json` scripts so `pnpm check` succeeds. If ESLint is ever added
  to this repo, fold it into the `check` script too (e.g. `tsc --noEmit &&
  eslint .`).
