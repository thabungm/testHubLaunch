# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Implemented welcome landing page (index.html, styles.css) + GitHub Pages workflow
- Blockers: None (note: GitHub Pages must be enabled manually in repo Settings → Pages → Source → "GitHub Actions" — human action, outside agent scope)

## Key Discoveries
- Greenfield repo: no package.json, no build tooling, no lint/type-check. Verification = grep-based AC checks + HTML/YAML parse.
- No pre-existing index.html — no overwrite conflict.
- .github/ only had a scripts/ dir; created .github/workflows/pages.yml.

## Solutions That Worked
- Used exact reference implementation from the plan for index.html and styles.css.
- Validated ACs with grep (title, h1, 🚧 icon, viewport, no-script, no-external, lang=en).
- Parsed HTML with python html.parser to confirm well-formed.

## Things to Avoid
- No JS build tooling exists here — don't look for npm test/lint; none apply.

## Files Modified
- index.html (new)
- styles.css (new)
- .github/workflows/pages.yml (new)

## Open Questions
- GitHub Pages activation requires human with admin access; workflow file alone insufficient.

## Next Steps
- Done. All 7 local acceptance criteria (AC1-AC7) met. AC8 depends on push + Pages activation.
