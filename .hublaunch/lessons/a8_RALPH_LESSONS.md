# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created landing page files + Pages workflow, validated all ACs, committed
- Blockers: GitHub Pages must be manually enabled (Settings → Pages → Source → "GitHub Actions") by repo admin — human step, outside agent control

## Key Discoveries
- Greenfield repo: no package.json, no build/lint/type-check tooling. Verification = structural checks + AC grep, not `npm run`.
- No yaml parser (pyyaml/js-yaml) installed and pip install blocked in sandbox — validated workflow YAML by manual indentation review (copied verbatim from plan).
- `.github/` had only `scripts/`, no `workflows/` — created `workflows/pages.yml`.

## Solutions That Worked
- node one-liners for HTML tag-balance + stylesheet-link + emoji-count checks (no deps needed).
- grep-based acceptance-criteria verification for h1/title/icon/viewport/no-script/no-external-resources.

## Things to Avoid
- Don't rely on pyyaml/js-yaml in this sandbox — not available, install blocked.

## Files Modified
- index.html (new)
- styles.css (new)
- .github/workflows/pages.yml (new)

## Open Questions
- None

## Next Steps
- Human: enable GitHub Pages in repo settings so the workflow (AC8) can deploy on push to main.
