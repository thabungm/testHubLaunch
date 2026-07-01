# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created landing page files + GitHub Pages workflow, verified, committed
- Blockers: GitHub Pages must be manually enabled in repo settings (Settings → Pages → Source → "GitHub Actions") — requires human with admin access. Cannot be done from CLI.

## Key Discoveries
- Greenfield repo: no package.json, no framework, no build tools, no linters/type-checkers. Plan explicitly chose plain HTML5/CSS3. Therefore "type-check/lint" = structural HTML/CSS validation only.
- No pyyaml/yaml module installed; pip unavailable in sandbox. Validated workflow YAML via node read + it is verbatim from the plan spec.
- `.github/` only had `scripts/`; created `.github/workflows/pages.yml`.

## Solutions That Worked
- HTML well-formedness verified with Python's built-in html.parser (no unclosed tags).
- Content assertions via grep: h1 text, title, emoji, lang, viewport, no <script>, no external resources — all pass.

## Things to Avoid
- Don't look for npm/tsc/eslint here — none exist. Don't fabricate a build step.

## Files Modified
- index.html (new) — landing page, semantic HTML5, h1 "Welcome to Hula", under-construction section
- styles.css (new) — centered flex layout, amber under-construction banner, responsive rem units
- .github/workflows/pages.yml (new) — GitHub Actions deploy to Pages on push to main

## Open Questions
- None (Pages activation is a documented manual human step, out of agent control)

## Next Steps
- Human: enable GitHub Pages in repo settings (source = GitHub Actions) so the workflow deploys.
