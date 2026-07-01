# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created landing page + Pages workflow, validated all ACs, committed
- Blockers: GitHub Pages must be enabled manually in repo Settings → Pages → Source → "GitHub Actions" (human/admin action, outside worktree scope)

## Key Discoveries
- Greenfield repo: no package.json, no framework, no lint/type-check/test tooling. Verification for plain HTML/CSS is structural validation + manual browser render.
- No pre-existing index.html — no overwrite conflict.
- .github/ had only scripts/, no workflows/ dir — created workflows/pages.yml.

## Solutions That Worked
- Used Python html.parser to confirm HTML well-formedness (no unclosed tags).
- grep-based checks for each acceptance criterion (title, h1, icon, no-js, no-external, lang, viewport).

## Things to Avoid
- Don't look for npm/lint commands here — none exist. Seeking a build step is pointless for static HTML.

## Files Modified
- index.html (new) — landing page
- styles.css (new) — stylesheet
- .github/workflows/pages.yml (new) — GitHub Pages deploy workflow

## Open Questions
- None

## Next Steps
- Human must enable GitHub Pages in repo settings for AC8 deployment (cannot be done from worktree).
