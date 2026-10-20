# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created MONOREPO_E2E_MARKER.md with live-observed values; typecheck passes.
- Blockers: None

## Key Discoveries
- `hula` CLI is NOT on PATH in this sandbox → line 4 correctly resolves to "not installed".
- `RALPH_CONTAINER_MODE` is set to `true`.
- Node version in sandbox: v20.20.2.
- Deps are not preinstalled; `npm install` is required before `npm run typecheck` (tsc).

## Solutions That Worked
- Single `node -e` invocation computing all four lines live and writing the file (per plan).
- `command -v hula` confirmed the CLI is absent (node execSync used /bin/sh, same result).

## Things to Avoid
- Did NOT run `npm run test:contact` — it does a live Slack send needing SLACK_URL and is irrelevant to a markdown-only change.

## Files Modified
- Created: MONOREPO_E2E_MARKER.md (repo root) — the only task file.

## Open Questions
- None.

## Next Steps
- Done. PR/commit handled by the launch pipeline.
