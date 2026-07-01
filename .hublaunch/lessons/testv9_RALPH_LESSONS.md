# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Implemented welcome landing page (index.html + styles.css) and GitHub Pages workflow; all acceptance criteria verified; committed as 8c5b413
- Blockers: GitHub Pages must be manually enabled in repo settings by a human (Settings → Pages → Source → "GitHub Actions"). Not automatable from here.

## Key Discoveries
- Greenfield static site: no package.json, no build tools, no lint/typecheck config. Plain HTML5 + CSS3 by design.
- Repo root is served directly; `.github/` existed with only a `scripts/` dir, no workflows.
- No `yaml` python module available; validated workflow structurally instead (node + string checks).

## Solutions That Worked
- Wrote index.html + styles.css exactly per plan's reference implementation.
- Created .github/workflows/pages.yml using actions/deploy-pages@v4 (path '.').
- Verified all 8 ACs via grep/node structural checks (h1, title, 🚧, Under Construction, msg, no <script>, no external URLs, lang, viewport, css link, balanced tags/braces).

## Things to Avoid
- Don't rely on `python yaml` module — not installed. Use node or string checks.

## Files Modified
- index.html (new)
- styles.css (new)
- .github/workflows/pages.yml (new)

## Open Questions
- None (deployment-side Pages enablement is a human-only step, documented in plan).

## Next Steps
- Human: enable GitHub Pages in repo settings to complete AC8 deployment.
