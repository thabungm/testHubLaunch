# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✅
- Last action: Created about.html + about.css, verified all 8 acceptance criteria, committed.
- Blockers: None

## Key Discoveries
- This repo (testHubLaunch) is a **plain static-site repo** — NO package.json, NO pnpm,
  NO TypeScript, NO framework. It only contains plan/lesson scaffolding plus a `test` file.
- The ralph.md verification requirements (`pnpm tsc --noEmit`, `pnpm check`, IVR sim) are
  written for a different (Next.js/IVR) project and DO NOT APPLY here. There is no build
  tooling to run; attempting `pnpm` commands would fail because there's no package.json.
- The plan explicitly mandates plain HTML5 + CSS3, no JS, no npm — consistent with the above.
- The `index.html`/`contact.html` "existing pattern" referenced in the plan do NOT yet exist
  in this repo (they are separate planned features). Followed the reference structure in the
  plan directly instead.

## Solutions That Worked
- Created exactly two files in repo root per the plan's reference structure:
  - `about.html` — HTML5 boilerplate, lang="en", viewport meta, <title>About — Hula</title>,
    <main> with <h1>Welcome to Hula</h1> and the placeholder <p>.
  - `about.css` — CSS reset, flex-centered body, max-width 600px main, h1 2.5rem, p 1.125rem.
- The em-dash in the title must be a real U+2014 char (verified bytes e2 80 94), not a hyphen.
- Verified acceptance criteria with grep checks (all 8 PASS).

## Things to Avoid
- Don't run `pnpm tsc`/`pnpm check`/IVR sims here — no package.json, they're irrelevant and fail.

## Files Modified
- Created: about.html
- Created: about.css

## Open Questions
- None.

## Next Steps
- None — mission complete. Files committed.
