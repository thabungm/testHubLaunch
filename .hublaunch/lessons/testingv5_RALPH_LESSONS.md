# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created landing page files + GitHub Pages workflow, validated, committed (89e9a5a)
- Blockers: GitHub Pages must be manually enabled in repo settings (Settings → Pages → Source → "GitHub Actions"). Human-only step; cannot be done from here.

## Key Discoveries
- Greenfield repo: no package.json, no framework, no build tools. Plain HTML/CSS is correct.
- `.github/` only had a `scripts/` dir; no `workflows/` existed — created `workflows/pages.yml`.
- No project-level type-check/lint/test commands exist (no hublaunch.config.js, no package.json). Verification is HTML/CSS validity + AC checklist.
- No `yaml`/`yamllint`/`tidy` available in env; validated YAML via structure check and HTML via python html.parser.

## Solutions That Worked
- Used exact reference implementation from the plan for index.html and styles.css.
- Validated all 8 acceptance criteria with grep checks (title, h1, 🚧 icon, no <script>, no external refs, lang, viewport).

## Things to Avoid
- Do not add JS or external resources (AC6/AC7 forbid them).

## Files Modified
- index.html (new)
- styles.css (new)
- .github/workflows/pages.yml (new)

## Open Questions
- None. GitHub Pages activation is a human/admin action outside this environment.

## Next Steps
- Human: enable GitHub Pages in repo settings so the pages.yml workflow deploys.
