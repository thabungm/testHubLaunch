# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Wrote MONOREPO_E2E_MARKER_2.md with live values; ran verification.
- Blockers: None (test:contact needs SLACK_URL which is unset in sandbox — environmental, unrelated to this change).

## Key Discoveries
- This is a disposable E2E smoke test: create exactly ONE file, MONOREPO_E2E_MARKER_2.md, at repo root with 4 live-observed lines.
- `hula` CLI is NOT on PATH in this sandbox → line 4 = "not installed" (execSync throws, caught).
- Live values observed: Node v20.20.2, RALPH_CONTAINER_MODE=true.
- node_modules was absent; `npm install` added 6 packages.

## Solutions That Worked
- Single `node -e` invocation computing all 4 lines (execSync('hula --version') in try/catch) then writeFileSync — exactly as the plan's illustrative snippet.
- npm run typecheck ✓ (clean), npm run build ✓ (clean).

## Things to Avoid
- Don't print/write any env var value other than RALPH_CONTAINER_MODE. Checked SLACK_URL presence without echoing its value.
- Don't fabricate SLACK_URL to make test:contact pass — plan forbids it; the failure is environmental.

## Files Modified
- Created: MONOREPO_E2E_MARKER_2.md (the only intended file)
- Updated: this lessons file (protocol)

## Open Questions
- None.

## Next Steps
- Done. Launch pipeline handles commit/PR.
