# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE — feature already implemented & merged; verified this session.
- Last action: Ran typecheck + full core-logic verification (13/13 pass).
- Blockers: Live Slack send (AC2) cannot be executed here — no SLACK_URL in env
  and no .env file exists in this worktree. Code path is verified correct.

## Key Discoveries
- The Contact Us feature was ALREADY implemented and merged (commit e4bf664,
  PR #110). Files present: scripts/contact.ts, scripts/test-contact.ts,
  package.json, tsconfig.json, README.md. All match the plan.
- Node here is v20.20.2 (NOT v24). Native TS type-stripping unavailable, so
  package.json scripts use `tsx` (the documented fallback), not bare `node`.
  This is correct for this environment.
- No .env / no SLACK_URL anywhere in the environment. `env | grep -i slack`
  finds nothing; no .env on any branch. The live happy-path send is env-gated.
- The plan's "bad webhook" example URL (https://hooks.slack.com/services/INVALID)
  now 302-redirects to Slack docs and returns HTTP 200 with HTML — so it does
  NOT produce a non-200. Not a code bug; the sender faithfully returns whatever
  status/body it gets.

## Solutions That Worked
- `npm install` to get tsx/typescript/@types/node (node_modules is gitignored).
- `npm run typecheck` (tsc --noEmit, strict) → 0 errors.
- Verified core logic with an inline scripts/_verify.ts (removed after): all 13
  checks pass — validation (all-blank→4 issues, bad email, whitespace, valid),
  escaping (&,<,>), header 150-char truncation, body ~2900 truncation, Block Kit
  structure, and submitContactForm throwing on unset SLACK_URL.
- Guard tests: unset SLACK_URL → `FAIL: SLACK_URL not set` exit 1 (correct).

## Things to Avoid
- Don't put a top-level-await verify script OUTSIDE the project dir — tsx treats
  it as CJS and fails. Keep it under scripts/ (package.json has type:module).

## Files Modified
- None modified. Feature files already existed and are correct.
- node_modules/ created by npm install (gitignored). Working tree clean.

## Verification Results (Acceptance Criteria)
- AC1 submitContactForm valid→post: logic verified (payload/POST correct);
  live 200 not runnable (no SLACK_URL).
- AC2 live test HTTP 200: NOT runnable here — no SLACK_URL. Code correct.
- AC3 validateContact rejects blanks/bad email, all issues, no send: ✓ verified.
- AC4 unset SLACK_URL → throw / exit 1: ✓ verified.
- AC5 non-200 → exit 1: code correct (couldn't force a real non-200 w/o webhook).
- AC6 URL never logged: ✓ confirmed by code review.
- AC7 Block Kit + escaping: ✓ verified.
- AC8 no runtime deps, runs via tsx on Node 20: ✓.
- AC9 README documents setup/usage: ✓ present.

## Next Steps
- If a real SLACK_URL becomes available, run `npm run test:contact` to complete
  the live AC2 send. Otherwise the implementation is complete and verified.
