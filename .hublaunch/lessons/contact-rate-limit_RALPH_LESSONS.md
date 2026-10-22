# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✅
- Last action: All verification passed (typecheck, build, test:contact ALL PASS, manual edge-case checks)
- Blockers: None

## Solutions That Worked
- Separate scripts/rate-limit.ts with checkRateLimit (read-only) + recordSuccess (write on 200).
- Pass `now` into limiter fns for deterministic tests.
- Test isolation via process.env.CONTACT_RATE_LIMIT_FILE = os.tmpdir()+pid+hrtime (no Date.now/Math.random).
- Stub globalThis.fetch (cast `as typeof fetch`, return `as Response`) for rate-limit tests; restore in each catch and at end.
- Verified cross-process persistence + corrupt/missing file + invalid env fallback via a /tmp probe script run under tsx.

## Files Modified
- scripts/rate-limit.ts (NEW)
- scripts/contact.ts (RateLimitError, import, guard before fetch, record after 200, main() catch branch)
- scripts/test-contact.ts (isolation + Tests 3-6)
- .gitignore (.contact-rate-limit.json)
- README.md (RateLimitError API + Rate limiting section)

## Verification Results
- npm run typecheck → clean
- npm run build → ok
- npm run test:contact → ALL PASS (6 tests incl. live send)
- .contact-rate-limit.json confirmed gitignored

## Key Facts
- SLACK_URL is set in env (live test can run).
- Plan: add file-backed per-email sliding-window rate limiter.
- New module: scripts/rate-limit.ts; wire into scripts/contact.ts (RateLimitError + guard).
- tsconfig: strict + verbatimModuleSyntax + allowImportingTsExtensions → use `import type` and `.ts` import extensions, `node:` prefix for builtins.
- Slack returns 200 + body "ok" on success.

## Key Discoveries
<!-- Add important findings here as you work -->

## Solutions That Worked
<!-- Record successful fixes so they can be reused -->

## Things to Avoid
<!-- Record approaches that failed or caused issues -->

## Files Modified
<!-- Track which files you've changed -->

## Open Questions
<!-- Things that need clarification or further investigation -->

## Next Steps
<!-- What should be done next -->
