# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE (committed as 454c4c2 on main)
- Last action: Created landing page (index.html, styles.css) + GitHub Pages workflow; all ACs verified
- Blockers: GitHub Pages must be enabled manually in repo settings (human/admin action, out of agent scope)

## Key Discoveries
- Greenfield repo: only an empty `test` file existed at root, no package.json, no framework.
- `.github/` existed with only a `scripts/` dir; no workflows — created `.github/workflows/pages.yml`.
- No YAML/python-yaml/ruby available in sandbox to lint the workflow; syntax is verbatim-standard GitHub Actions.

## Solutions That Worked
- Plain static HTML5 + CSS3 per plan reference implementation (no build step needed).
- grep-based AC verification since there's no type-check/lint toolchain for plain HTML/CSS.

## Things to Avoid
- No JS, no external resources (kept AC6/AC7 green).

## Files Modified
- index.html (new)
- styles.css (new)
- .github/workflows/pages.yml (new)

## Open Questions
- None (Pages activation is a human admin step, documented in plan).

## Next Steps
- Human: enable GitHub Pages source = "GitHub Actions" in repo settings so the workflow deploys.
