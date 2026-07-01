# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✅
- Last action: Implemented welcome landing page + GitHub Pages workflow, verified all 8 ACs, committed
- Blockers: AC8 (GitHub Pages activation) requires a human to enable Pages in repo Settings → Pages → Source → "GitHub Actions". Cannot be done from the agent.

## Key Discoveries
- Repo is greenfield: no package.json, no build tooling, no framework. Pure static HTML/CSS.
- No lint/type-check commands exist (no package.json/Makefile) — verification is done via file/HTTP checks, not tooling.
- `.github/` had only a `scripts/` dir; created `.github/workflows/pages.yml` from scratch.
- No pre-existing index.html/styles.css — no overwrite conflict.

## Solutions That Worked
- Verified ACs with grep assertions against index.html/styles.css.
- Verified rendering with `python3 -m http.server` + curl: GET / → 200 (title/h1 correct), GET /styles.css → 200 (850 bytes).
- HTML tag-balance validated via python html.parser — well-formed, no unclosed tags.

## Things to Avoid
- pyyaml not installed in this env (offline); don't rely on it for YAML validation. The pages.yml is a verbatim copy of the standard actions/deploy-pages template from the plan.

## Files Modified
- index.html (created) — landing page, matches plan reference exactly + intent HTML comment
- styles.css (created) — stylesheet, matches plan reference exactly
- .github/workflows/pages.yml (created) — GitHub Pages deploy workflow

## Open Questions
- None. Only remaining item is the manual GitHub Pages activation (AC8), which is outside agent scope.

## Next Steps
- Human: enable GitHub Pages (Settings → Pages → Source → "GitHub Actions") to activate deployment.
