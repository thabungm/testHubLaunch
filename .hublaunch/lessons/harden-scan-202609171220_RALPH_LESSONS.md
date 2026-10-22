# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Opened PR #277 https://github.com/thabungm/testHubLaunch/pull/277
- Blockers: None
- Note: ralph.md had a pre-existing unrelated modification -> intentionally left out of the PR.

## Key Discoveries
- Codebase: tiny "Contact Us -> Slack" feature. App code = scripts/contact.ts (+ test-contact.ts, build.mjs).
- No runtime deps; only devDeps (tsx, typescript, @types/node). `npm audit` = 0 vulnerabilities.
- Main sink: scripts/contact.ts:81 `fetch(url,...)` where url = process.env.SLACK_URL (unvalidated).
- FINDING (Medium/High): SLACK_URL destination is not validated. submitContactForm POSTs user PII
  (name, email, subject, body) to ANY url in env. Misconfig/env-injection => SSRF + PII exfiltration.
  README documents SLACK_URL as a Slack Incoming Webhook (https://hooks.slack.com/...). Fix: enforce
  https scheme + hostname hooks.slack.com, generic error (don't echo URL -> avoid leaking secret).
- FINDING (Low): fetch has no timeout -> hung endpoint hangs process. Add AbortSignal.timeout.
- NOTE (info, no fix): mrkdwn escaping of &<> is Slack's documented escaping; * _ ` cannot break
  message structure, so not a real injection.
- Do NOT edit .github/scripts/* or ralph.md/harden.md (bundled HubLaunch tooling).

## Solutions That Worked
- Added resolveSlackUrl() in scripts/contact.ts: validates https + hostname===hooks.slack.com,
  generic error (no URL echo). Added AbortSignal.timeout(10s) to fetch. Updated README.
- Verified all branches with a temp tsx script (must live in /workspace, not /tmp, for module resolution).
- typecheck (needs `npm install` first — tsc not global), build, npm audit all pass with 0 issues.
- SLACK_URL not set in container, so live test (test-contact.ts) is skipped by design.

## Things to Avoid
<!-- Record approaches that failed or caused issues -->

## Files Modified
<!-- Track which files you've changed -->

## Open Questions
<!-- Things that need clarification or further investigation -->

## Next Steps
<!-- What should be done next -->

## Update (later session, same branch)
- Issue report said `pnpm check` -> "Command 'check' not found". Confirmed: package.json has
  no "check" script (only contact, test:contact, typecheck, build). No ESLint config in repo either.
- Ran `pnpm typecheck` (tsc --noEmit) as the closest equivalent -> 0 errors. Working tree clean,
  nothing to fix. If a future task insists on `pnpm check`, it likely means add a "check" script
  (e.g. alias to typecheck) rather than a missing fix — confirm with user/task issuer before adding
  scripts, since none of the prior work defined one.

## Update (3rd session, same branch)
- Re-ran the identical scan: `pnpm check` still absent (no script, no ESLint config found via
  find for .eslintrc*/eslint.config.*). `pnpm typecheck` still 0 errors. Working tree clean,
  2 commits ahead of origin (not pushed). No code changes made this session -> this is a stable,
  repeatable non-issue, not transient. Stop re-investigating "pnpm check" on this branch unless
  package.json actually gains a check script or new source changes introduce real ts/lint errors.
