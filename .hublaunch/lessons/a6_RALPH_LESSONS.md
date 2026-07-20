# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created landing page files + Pages workflow, verified, committing
- Blockers: GitHub Pages must be manually enabled in repo settings (human/admin task, out of agent scope)

## Key Discoveries
- Greenfield repo: no package.json, no npm, no build tools. Plain HTML/CSS per plan.
- No project-level type-check/lint commands exist (.hublaunch/hublaunch.config.js absent). Verification = HTML validity + content checks + tag balance.
- .github/ only had scripts/, no workflows/ dir — created workflows/pages.yml.

## Solutions That Worked
- Verified content with grep counts (heading, title, emoji, lang, no <script>, no external URLs).
- Verified HTML tag balance with grep -o on open/close tags — all balanced.

## Things to Avoid
- python3 has no yaml module in this env; validate YAML structurally instead.

## Files Modified
- index.html (new) — landing page
- styles.css (new) — styles
- .github/workflows/pages.yml (new) — GitHub Pages deploy workflow

## Open Questions
- None

## Next Steps
- Human must enable GitHub Pages (Settings -> Pages -> Source -> GitHub Actions).
