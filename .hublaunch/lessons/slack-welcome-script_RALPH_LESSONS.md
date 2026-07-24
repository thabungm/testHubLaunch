# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: **COMPLETE** ✅
- Last action: Updated lessons file
- Blockers: None

## Key Discoveries
- Node v20 is running in the repo (not v24), so native TypeScript support is unavailable
  - Solution: Use `tsx` (already installed in devDependencies) instead of `node` for running .ts files
- The repo already has a package.json with TypeScript tooling (tsx, tsc, @types/node)
- ESM module type (`"type": "module"`) already configured in package.json
- Scripts directory already existed with existing contact scripts

## Solutions That Worked
1. **TypeScript execution on Node v20**: Use `tsx scripts/file.ts` via npm scripts instead of `node`
2. **Error handling**: Consistent pattern of stderr messages + non-zero exit codes for all error cases
3. **Guard for direct execution**: Use `import.meta.url === \`file://${process.argv[1]}\`` to detect direct execution vs. import
4. **URL security**: Never log the full SLACK_URL webhook; only log status/body on error
5. **Environment handling**: Use `.trim()` on env vars to catch whitespace-only values

## Things to Avoid
- Do NOT add axios, node-fetch, or dotenv packages (Node 18+ fetch + proper env setup sufficient)
- Do NOT transpile or build before running (tsx handles this)
- Do NOT hard-code SLACK_URL (always read from process.env)

## Files Modified
- `package.json` — added `send` and `test:slack` npm scripts (using tsx)
- `scripts/send-slack.ts` — NEW, exports sendSlackMessage() + CLI entry point
- `scripts/test-send-slack.ts` — NEW, imports and tests sendSlackMessage()
- `README.md` — added "Slack Welcome Message Script" section with usage docs

## Open Questions
None — plan fully implemented and verified.

## Next Steps
Complete! All acceptance criteria met. Ready for HubLaunch integration testing with real SLACK_URL.
