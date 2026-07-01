# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created landing page files + Pages workflow, verified all ACs, committed.
- Blockers: None (see Open Questions for human step)

## Key Discoveries
- Greenfield repo: no package.json, no framework, no type-check/lint tooling. Verification is content/structural checks only (no test runner applies to plain HTML/CSS).
- Python `pyyaml` is NOT installed in this env; `node` IS available. Use node for YAML/structural checks.
- No pre-existing index.html — safe to create (no overwrite).

## Solutions That Worked
- Created index.html, styles.css in repo root (GitHub Pages serves root directly).
- Created .github/workflows/pages.yml (dir did not exist) using actions/deploy-pages@v4.
- Verified ACs via grep: title, h1, 🚧 icon, "Under Construction", lang="en", viewport, css link, no <script>, no external http(s) URLs.

## Things to Avoid
- Don't try `python3 -c "import yaml"` for validation here — module missing. Use node.

## Files Modified
- index.html (new)
- styles.css (new)
- .github/workflows/pages.yml (new)

## Open Questions
- GitHub Pages must be manually enabled by a repo admin: Settings -> Pages -> Source -> "GitHub Actions". Workflow file alone is insufficient (documented in plan). This is a human step outside agent control.

## Next Steps
- None. Plan 100% implemented. Human enables Pages in repo settings for AC8.
