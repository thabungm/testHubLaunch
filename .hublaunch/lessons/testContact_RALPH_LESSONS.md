# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created contact.html + contact.css, verified all ACs, committed
- Blockers: None

## Key Discoveries
- This repo (`thabungm/testHubLaunch`) is a PLAIN STATIC HTML / GitHub Pages project.
- There is NO package.json, NO pnpm, NO TypeScript, NO IVR system here.
  Therefore the ralph.md verification steps (`pnpm tsc --noEmit`, `pnpm check`,
  `pnpm ivr:sim`, regression) DO NOT APPLY — there is no toolchain to run them.
- Repo root before work: only `test`, `ralph.md`, `ralph-run.sh`, `.hublaunch/`, `.git/`.

## Solutions That Worked
- Created the two files verbatim from the plan: `contact.html` + `contact.css` at repo root.
- Verified static ACs with grep (title, h1, viewport, lang, css link, label/input
  pairs, email type, required attrs, no external URLs).
- Verified the dynamic inline submit-handler logic by extracting the exact script
  body and running it under a minimal Node DOM stub: confirmed preventDefault() is
  called, #success-msg display flips to "block", and form.reset() runs. PASS.

## Things to Avoid
- Don't try to run `pnpm`/`tsc` here — no package.json exists; it will just error.
- No jsdom is installed; used a hand-rolled DOM stub instead for the handler test.

## Files Modified
- contact.html (created)
- contact.css (created)

## Open Questions
- None.

## Next Steps
- None — plan fully implemented and verified. Optional future: link from index.html
  to contact.html if/when the landing page is implemented (out of scope here).
