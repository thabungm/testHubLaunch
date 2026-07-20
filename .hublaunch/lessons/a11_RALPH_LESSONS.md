# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created landing page files + Pages workflow, verified all ACs, committed
- Blockers: GitHub Pages must be manually enabled in repo settings (Settings → Pages → Source → "GitHub Actions"). Requires human admin access; cannot be done from code.

## Key Discoveries
- Greenfield repo: no package.json, no framework, no build tools. Plain static HTML/CSS is correct.
- No project-level type-check/lint commands exist (no package.json). Verification = HTML/CSS syntax + AC content checks.
- No pre-existing index.html — no overwrite conflict.
- .github/ only had scripts/ dir; created .github/workflows/pages.yml.

## Solutions That Worked
- HTML validation via python3 html.parser; CSS validation via balanced-brace count.
- AC checks via grep for title, h1, 🚧, lang, viewport, no <script>, no external URLs.

## Things to Avoid
- Nothing notable.

## Files Modified
- index.html (new)
- styles.css (new)
- .github/workflows/pages.yml (new)

## Open Questions
- None. AC8 (Pages deployment) depends on human enabling Pages in repo settings.

## Next Steps
- Human: enable GitHub Pages (Source = GitHub Actions) so the deploy workflow can publish.
