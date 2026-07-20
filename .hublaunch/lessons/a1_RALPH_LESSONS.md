# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created landing page + Pages workflow, verified all AC, committed (4ca21ff)
- Blockers: GitHub Pages must be enabled in repo settings by a human (Settings → Pages → Source → "GitHub Actions") — outside worktree scope

## Key Discoveries
- Greenfield repo: no package.json, no build/lint/test tooling. Plain static HTML/CSS.
- No pre-existing index.html — no overwrite conflict.
- `.github/` had only `scripts/`, no `workflows/` — created workflows/pages.yml.
- No pyyaml in env; validated YAML structurally instead.

## Solutions That Worked
- Used exact reference implementation from plan for index.html and styles.css.
- Verified ACs via grep (heading, icon, title, viewport, no <script>, no external URLs, lang=en).

## Things to Avoid
- Write tool requires a prior Read (not Bash cat) of the target file in-session.

## Files Modified
- index.html (new)
- styles.css (new)
- .github/workflows/pages.yml (new)

## Open Questions
- None

## Next Steps
- Human must enable GitHub Pages in repo settings for AC8 deployment.
