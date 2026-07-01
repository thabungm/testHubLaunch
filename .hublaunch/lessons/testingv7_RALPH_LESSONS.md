# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created landing page files, verified all acceptance criteria, committed.
- Blockers: GitHub Pages must be manually enabled in repo settings (human-only step, out of scope for agent).

## Key Discoveries
- Greenfield repo: no package.json, no build tools, no type-check/lint commands. Plain HTML/CSS only.
- No existing index.html — no conflict risk.
- Repo has .github/scripts but no .github/workflows before this change.

## Solutions That Worked
- Followed reference implementations in the plan verbatim for index.html and styles.css.
- Verified acceptance criteria with grep checks (h1, title, viewport, no <script>, no external URLs, lang="en").
- HTML/CSS well-formedness: all real tags balanced, CSS braces balanced. (A naive HTMLParser will false-flag `/>` on void <meta>/<link> — those are valid HTML5.)

## Things to Avoid
- Don't rely on a naive HTMLParser to validate void self-closing elements; it reports false mismatches.

## Files Modified
- index.html (new) — landing page with "Welcome to Hula" h1 + under-construction section
- styles.css (new) — centered flex layout, amber under-construction banner
- .github/workflows/pages.yml (new) — GitHub Pages deploy workflow

## Open Questions
- None.

## Next Steps
- Human: enable GitHub Pages (Settings → Pages → Source → "GitHub Actions") to activate deployment.
