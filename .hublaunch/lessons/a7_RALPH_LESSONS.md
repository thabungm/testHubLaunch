# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created landing page files + Pages workflow, validated, committed
- Blockers: GitHub Pages must be manually enabled in repo settings (Settings → Pages → Source → "GitHub Actions") — requires human admin; cannot be done from code.

## Key Discoveries
- Greenfield repo: no package.json, no framework, no lint/type-check tooling. Plain static HTML/CSS per plan.
- No `tidy` available; used Python html.parser for structural validation and brace-balance for CSS.
- Repo root had only an empty `test` file; no pre-existing index.html (no conflict).

## Solutions That Worked
- Validation without a browser: Python HTMLParser to check tag nesting + confirm linked stylesheet exists; grep for AC checks (title, h1, no <script>, no external refs).

## Things to Avoid
- Nothing notable.

## Files Modified
- index.html (new) — landing page
- styles.css (new) — styles
- .github/workflows/pages.yml (new) — GitHub Pages deploy workflow

## Open Questions
- None (Pages activation is the only human-gated step).

## Next Steps
- Human: enable GitHub Pages (source = GitHub Actions) so the workflow deploys.
