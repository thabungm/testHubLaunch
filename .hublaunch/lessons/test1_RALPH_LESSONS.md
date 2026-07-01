# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created landing page files + Pages workflow, verified all ACs, committed
- Blockers: None (AC8 requires human to enable GitHub Pages in repo settings — noted in plan)

## Key Discoveries
- Greenfield repo: no package.json, no framework, no lint/type-check tooling. Plain HTML/CSS project.
- No pre-existing index.html — no conflict, safe to create.
- .github/ only had a scripts/ dir; created .github/workflows/pages.yml fresh.
- No python `yaml` module in sandbox — validated YAML by indentation/tab check instead.

## Solutions That Worked
- Copied reference implementations verbatim from the plan for index.html and styles.css.
- Verified all 8 acceptance criteria with grep checks (h1, title, 🚧, viewport, no <script>, no external http(s) links, lang=en, styles.css link).
- HTML parsed cleanly via python html.parser.

## Things to Avoid
- Don't rely on `python3 -c "import yaml"` — module not installed here.

## Files Modified
- index.html (created)
- styles.css (created)
- .github/workflows/pages.yml (created)

## Open Questions
- None. AC8 (Pages deployment) needs a human to enable Pages -> Source -> "GitHub Actions" in repo settings.

## Next Steps
- Done. Files committed.
