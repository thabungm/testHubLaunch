# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✓
- Last action: Fixed production build failure (deploy pipeline forwards
  `-- --concurrency=2` through `pnpm build`, which reached `tsc` directly)
- Blockers: None

## Key Discoveries
- Implementation was already complete in scripts/contact.ts and scripts/test-contact.ts
- SLACK_URL in environment had extra quotes and trailing comma
- Fixed URL parsing to strip quotes and trailing commas
- This project is a headless TS scripts project (no bundler/web app) — `ralph.md`
  documents an intentionally empty `RALPH_BUILD_COMMANDS` block ("no build step").
- Deploy pipeline runs `pnpm build` unconditionally, but `package.json` had no
  `build` script at all, causing `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL: Command "build" not found`.
- Deploy pipeline actually invokes `pnpm build -- --concurrency=2` (a flag meant
  for pnpm's recursive/workspace mode). Since this package isn't run via `pnpm -r`,
  pnpm just appends `-- --concurrency=2` onto the script's command line. When
  `build` was `tsc --noEmit`, that produced `tsc --noEmit -- --concurrency=2`,
  and `tsc` doesn't understand `--` as an end-of-options marker, so it errored
  with TS5023 `Unknown compiler option '--'` / `'--concurrency=2'`.
  Reproduce locally with: `pnpm build -- --concurrency=2`.

## Solutions That Worked
- Updated submitContactForm to handle quoted URLs: `url.replace(/^["']|["',]+$/g, "").trim()`
- Full Block Kit message structure with header, Name/Email fields, and Message section
- Validation collects all issues before any network call
- Live test actually sends to Slack and asserts HTTP 200
- CLI smoke test submits sample valid submission
- Added a `"build": "tsc --noEmit"` script to package.json — aliases build to the
  existing typecheck step since there's nothing to bundle/emit. Satisfies the
  deploy pipeline's `pnpm build` invocation without changing project behavior.
- Changed `build` to `node scripts/build.mjs`, a wrapper that ignores
  `process.argv` and runs a fixed `tsc --noEmit` via `spawnSync`. This absorbs
  any extra pass-through args (like `-- --concurrency=2`) pnpm appends to the
  script command line, instead of letting them leak into `tsc`'s argv.

## Things to Avoid
- Don't assume environment URLs won't have quotes - always sanitize
- Don't assume every project needs a real bundling build step — but the deploy
  pipeline always calls `pnpm build`, so a `build` script must exist even if it
  just delegates to typecheck (or is a no-op) for build-only-verification projects.
- Don't wire `build` directly to a CLI (like `tsc`) that errors on unknown flags
  if the deploy pipeline may pass extra args through `pnpm build -- <flags>`.
  Route through a small wrapper script that owns its own fixed argv instead.

## Files Modified
- scripts/contact.ts - FIXED URL parsing to handle quotes and trailing commas
- package.json - CHANGED `build` script from `tsc --noEmit` to
  `node scripts/build.mjs` to stop pnpm's forwarded `-- --concurrency=2` args
  from reaching `tsc` directly (TS5023 errors)
- scripts/build.mjs - ADDED wrapper that runs a fixed `tsc --noEmit` command,
  ignoring any extra CLI args passed through by pnpm

## Verification Results
- pnpm build: ✓ PASS (runs `node scripts/build.mjs` → `tsc --noEmit`, zero errors)
- pnpm build -- --concurrency=2: ✓ PASS (extra args absorbed by wrapper, no longer reach tsc)
- TypeScript type-check: ✓ PASS (zero errors/warnings)
- npm run test:contact: ✓ PASS (live send + validation tests)
- npm run contact: ✓ PASS (CLI smoke test)
- All acceptance criteria MET

## Implementation Complete
All 9 acceptance criteria verified:
- AC1: Valid submissions post to Slack with Block Kit
- AC2: Live test performs real Slack send, exits 0
- AC3: Validation rejects bad input, no Slack message sent
- AC4: Missing SLACK_URL handled correctly
- AC5: Non-200 responses logged correctly
- AC6: URL never printed to stdout/stderr
- AC7: Block Kit formatting with proper escaping
- AC8: No runtime deps, runs on Node v24
- AC9: README.md comprehensive documentation
