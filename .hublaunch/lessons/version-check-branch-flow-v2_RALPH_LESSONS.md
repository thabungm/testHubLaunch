# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: All acceptance criteria verified
- Blockers: None

## Key Discoveries
- The repo follows a headless script pattern (see scripts/contact.ts) where main() function is conditionally executed only when the script is run directly via `import.meta.url === file://${process.argv[1]}`
- Package.json was missing a "version" field, so the script correctly outputs "version: unknown" per plan spec
- Git SHA is available and reads correctly via git rev-parse HEAD

## Solutions That Worked
- Wrapped both package.json read and git rev-parse in separate try/catch blocks to allow independent fallback handling
- Used execSync for git command (synchronous, appropriate for one-shot CLI script)
- Used Node built-ins (child_process, fs, path) to maintain zero-dependency policy
- Tested edge case by temporarily moving .git and verified graceful degradation to "commit: unknown"

## Things to Avoid
<!-- Record approaches that failed or caused issues -->

## Files Modified
- scripts/version.ts (NEW) - implements version and git SHA output
- package.json - added "version-check": "tsx scripts/version.ts" script entry
- README.md - added "Version and commit info" section documenting npm run version-check

## Open Questions
None - implementation complete

## Next Steps
COMPLETE - All acceptance criteria met, all tests passing, no further work required
