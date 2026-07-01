# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created welcome landing page + GitHub Pages workflow, validated all ACs
- Blockers: GitHub Pages must be manually enabled in repo Settings → Pages → Source → "GitHub Actions" (human-only, cannot be automated)

## Key Discoveries
- Greenfield repo: no package.json, no framework, no build/lint/type-check tooling. Plain HTML/CSS only.
- Repo root had only an empty `test` file; no existing index.html (no conflict).
- `.github/` existed but only with `scripts/`; created `.github/workflows/` for the Pages workflow.
- No yaml/node available in sandbox for parsing — validated YAML by hand (no tabs, correct keys).

## Solutions That Worked
- Validated HTML via python html.parser (well-formed, no unclosed tags) and string checks for every acceptance criterion (AC2–AC7 all PASS).
- CSS brace balance check (8/8) and class-name cross-reference between HTML and CSS.

## Things to Avoid
- Don't rely on pyyaml/node in this sandbox — not installed.

## Files Modified
- index.html (new) — landing page, "Welcome to Hula" h1, under-construction section, title "Hula — Coming Soon"
- styles.css (new) — centered flex layout, amber under-construction banner
- .github/workflows/pages.yml (new) — deploy root to GitHub Pages on push to main

## Open Questions
- None

## Next Steps
- Human must enable GitHub Pages (source: GitHub Actions) for AC8 deployment to succeed.
