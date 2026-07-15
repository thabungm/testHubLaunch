# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE — plan fully implemented, merged, and verified.
- Last action: Verified all acceptance criteria except the real live send (SLACK_URL absent in this worktree).
- Blockers: None.

## Key Discoveries
- The Contact Us → Slack feature was already implemented and merged via PR #110
  (commit e4bf664). Files present and matching the plan:
  - `scripts/contact.ts` — ContactInput, ContactValidationError, validateContact,
    esc, buildSlackPayload (Block Kit), submitContactForm, direct-run main() guard.
  - `scripts/test-contact.ts` — live send test + validation-rejection test.
  - `package.json` — `"type": "module"`, scripts: contact / test:contact / typecheck.
  - `README.md` — full setup/usage docs.
  - `tsconfig.json` — strict, noEmit, allowImportingTsExtensions.
- Runtime here is Node **v20.20.2**, NOT v24. Node 20 cannot run `.ts` directly via
  native type-stripping, so package.json scripts correctly use **tsx** (devDep).
- SLACK_URL is NOT present in this worktree (no `.env`, not exported). The plan says
  it is forwarded to HubLaunch containers via `envVars: ['SLACK_URL']`. So the REAL
  live send (AC2) cannot execute here; every other path is verifiable.

## Solutions That Worked
- `npm run typecheck` (tsc --noEmit strict) → 0 errors.
- Missing-SLACK_URL guard: `tsx scripts/test-contact.ts` → "FAIL: SLACK_URL not set
  — cannot run live test", exit 1. ✓
- Validation (isolated temp file INSIDE scripts/ so ESM applies):
  all-blank → 4 issues (name/email-invalid/subject/body); email-only "bad" → email
  is invalid; whitespace-only name → name is required; valid → accepted. ✓
- Payload: escapes `<`,`>`,`&` (→ &lt; &gt; &amp;); header sliced to 150; body
  section text = "*Message:*\n" + 2900-char body = 2911 (< Slack 3000 limit). ✓
- Non-200 webhook: fake INVALID URL → HTTP 404 "no_team", test reports it, exit 1. ✓
- URL leak check: injected SECRET123/TOKEN456 webhook, grep of full output → no leak. ✓

## Things to Avoid
- Do NOT run `tsx -e '...import...'` or a temp .ts OUTSIDE the workspace: tsx compiles
  the imported module to CJS and contact.ts's top-level await (the direct-run guard,
  line ~146) fails with "Top-level await not supported with cjs". Put temp test files
  INSIDE `scripts/` (or workspace) so the `type:module` package.json makes it ESM.

## Files Modified
- None. Feature was already complete/merged (PR #110). Only ran verifications;
  cleaned up all temp test files.

## Open Questions
- None. To fully exercise AC2 (real live send) run inside a HubLaunch container that
  forwards SLACK_URL, or `set -a; source .env; set +a` then `npm run test:contact`.

## Next Steps
- Nothing outstanding. Plan is 100% implemented and verified to the extent the
  environment allows.
