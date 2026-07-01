# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created landing page files + Pages workflow, validated all ACs, committed
- Blockers: GitHub Pages must be manually enabled in repo settings (Settings → Pages → Source → "GitHub Actions") — requires human admin; cannot be done from code.

## Key Discoveries
- Greenfield repo: no package.json, no framework, no build tooling. Plain static HTML/CSS is correct.
- No pyyaml/ruby/node-yaml parser available in this env for YAML validation — used verbatim standard GitHub Actions Pages workflow from plan (structurally correct).
- No project type-check/lint commands exist (nothing to run for plain HTML/CSS).

## Solutions That Worked
- Validated HTML via python html.parser for tag balance + grep-based AC checks.
- Verified emoji UTF-8 encoding with python decode check.

## Things to Avoid
- Don't look for npm/build steps here — none exist.

## Files Modified
- index.html (new) — landing page, h1 "Welcome to Hula", under-construction section, title "Hula — Coming Soon"
- styles.css (new) — centered flex layout, amber under-construction banner, responsive
- .github/workflows/pages.yml (new) — deploy root of main to GitHub Pages

## Open Questions
- None

## Next Steps
- Human: enable GitHub Pages in repo settings so the workflow deploys (AC8).
