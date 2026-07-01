# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE (committed 4a30d91)
- Last action: Created landing page files, validated, committed to main
- Blockers: GitHub Pages must be manually enabled in repo settings (human/admin action — outside worktree scope)

## Key Discoveries
- Plain static site: no package.json, Makefile, npm, or lint/type-check tooling. Verification = structural checks (grep for AC content, HTML well-formedness, CSS brace balance).
- No headless browser (chromium/chrome) installed; node/npx present. Live render not possible — validated layout by inspection instead.
- Repo root had only an empty `test` file; no pre-existing index.html (no overwrite conflict).

## Solutions That Worked
- HTML well-formedness check via python html.parser (note: self-closing void tags <meta/>/<link/> show as false "MISMATCH" — final empty stack = well-formed).
- Responsive AC5 (375px, no h-scroll) satisfied by design: flex centering + main max-width:480px width:100% + relative units + body padding.

## Things to Avoid
- Don't try to install chromium for render tests here — not available; rely on structural validation.
- Lessons file must be Read (not just cat'd) before Write, or Write errors.

## Files Modified
- index.html (created) — landing page, h1 "Welcome to Hula", 🚧 under-construction section, title "Hula — Coming Soon"
- styles.css (created) — centered flex layout, amber under-construction banner
- .github/workflows/pages.yml (created) — GitHub Pages deploy workflow

## Open Questions
- None (Pages activation is a manual GitHub settings step, documented in plan as human blocker)

## Next Steps
- None. Plan 100% implemented. All ACs met except AC8 (deployment) which requires human to enable Pages.
