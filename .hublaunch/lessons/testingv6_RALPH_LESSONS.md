# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created welcome landing page + GitHub Pages workflow, validated all ACs
- Blockers: AC8 (GitHub Pages must be manually enabled in repo Settings → Pages → Source → "GitHub Actions" by a human with admin access — outside agent control)

## Key Discoveries
- Greenfield static project: no package.json, no hublaunch.config.js, no build/type-check/lint tooling exists. Verification = HTML well-formedness + acceptance-criteria grep checks.
- Repo root had only an empty `test` file + config dirs; no pre-existing index.html (no conflict).
- .github/ had only a `scripts/` dir, no `workflows/` — created workflows/pages.yml.

## Solutions That Worked
- Validated HTML well-formedness with a small python html.parser stack checker.
- Verified all 8 acceptance criteria via python string checks. All PASS except AC8 (deploy, needs human Pages activation).

## Things to Avoid
- No JS, no external resources (fonts/CDN) — plan explicitly forbids; kept page self-contained.

## Files Modified
- index.html (new) — landing page, semantic HTML5, title "Hula — Coming Soon", h1 "Welcome to Hula", under-construction section w/ 🚧
- styles.css (new) — centered flex layout, amber under-construction banner
- .github/workflows/pages.yml (new) — GitHub Pages deploy on push to main

## Open Questions
- None

## Next Steps
- Human must enable GitHub Pages in repo settings for AC8 deployment to succeed.
