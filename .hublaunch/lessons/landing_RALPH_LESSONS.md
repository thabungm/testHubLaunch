# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: All files created and verified
- Blockers: None (note: GitHub Pages must be manually enabled in repo settings — beyond Ralph's scope)

## Key Discoveries
- This is a greenfield static-site project. No `package.json`, no `pnpm`, no TypeScript, no build tooling.
- The ralph.md `pnpm tsc --noEmit` / `pnpm check` / IVR verification steps do NOT apply to this project — they target a different codebase template.
- Workspace contains only: `.git/`, `.hublaunch/`, `ralph.md`, `ralph-run.sh`, and an empty `test` file. No `.github/` exists yet.
- Plan calls for: `index.html`, `styles.css` (both in repo root), and `.github/workflows/pages.yml`.

## Solutions That Worked
- Wrote exact reference HTML/CSS from the plan into `index.html` and `styles.css` at repo root
- Created `.github/workflows/pages.yml` with the standard `actions/deploy-pages@v4` setup, `path: '.'` so the whole repo root deploys
- Validated structure with python: tag-balance check on HTML, selector/property presence on CSS, top-level key + step-count check on the workflow YAML

## Things to Avoid
- Don't try to run pnpm commands — there's no package.json.
- Don't overwrite the existing `test` file — it's tracked in git but unrelated to this work.

## Files Modified
- `index.html` (created)
- `styles.css` (created)
- `.github/workflows/pages.yml` (created — and `.github/workflows/` directory)
- `.hublaunch/lessons/landing_RALPH_LESSONS.md` (this file, updated)

## Open Questions
- None

## Next Steps
- Human admin must enable GitHub Pages in repo Settings → Pages → Source → "GitHub Actions" (called out in plan Phase 2 and "Blockers")
- After commit + push to `main`, the workflow will publish the page

## Acceptance Criteria Status
- AC1: ✓ `index.html` exists in root
- AC2: ✓ `<h1>Welcome to Hula</h1>` present
- AC3: ✓ 🚧 icon + "Under Construction" h2 + descriptive p present
- AC4: ✓ `<title>Hula — Coming Soon</title>` set
- AC5: ✓ `max-width: 480px` + `padding: 1.5rem` on body — readable at 375px (responsive by design)
- AC6: ✓ No `<script>` tags (grep confirmed)
- AC7: ✓ No external resource links (grep confirmed — only relative `styles.css`)
- AC8: pending human action to enable Pages
