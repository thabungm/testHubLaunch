# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created landing page files, validated, committing
- Blockers: None (except human-only: GitHub Pages must be enabled in repo settings → Source: GitHub Actions)

## Key Discoveries
- Greenfield static project: no package.json, no npm, no build tooling, no lint/type-check config.
- Verification for this project = structural/AC validation + browser render intent (no test suite exists).
- `.github/` only had `scripts/`; no `workflows/` dir existed, so created `.github/workflows/pages.yml`.
- No existing root `index.html` — no overwrite conflict.

## Solutions That Worked
- Used node one-liners to validate YAML structure, HTML tag balance, and CSS brace balance (no yaml module / html linters installed).
- All code-checkable acceptance criteria (AC2-AC7) verified via grep.

## Things to Avoid
- python3 has no `yaml` module here — validate YAML via node instead.

## Files Modified
- index.html (created) — semantic HTML5, title "Hula — Coming Soon", h1 "Welcome to Hula", under-construction section with 🚧
- styles.css (created) — centered flex layout, amber under-construction banner, responsive rem units
- .github/workflows/pages.yml (created) — GitHub Pages deploy on push to main

## Open Questions
- None

## Next Steps
- AC8 (Pages deployment) requires a human to enable GitHub Pages in repo settings; workflow file is in place and ready.
