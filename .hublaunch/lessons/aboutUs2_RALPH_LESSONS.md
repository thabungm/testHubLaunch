# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created about.html + about.css, verified all acceptance criteria, committed
- Blockers: None

## Key Discoveries
- This repo is a PLAIN STATIC HTML project — there is NO package.json, NO Node/pnpm
  project, NO framework, NO build tooling. Repo root only had ralph.md, ralph-run.sh,
  .hublaunch/, .git/, and an empty `test` file.
- The pnpm tsc/pnpm check/IVR verification steps in ralph.md DO NOT APPLY here — they
  assume a Node/IVR codebase. There is nothing to compile or lint. (pnpm binary exists
  on PATH but there's no project for it to operate on.)
- index.html and contact.html referenced in the plan as "existing patterns" do NOT
  actually exist yet — they are only planned. about.html is standalone and self-contained.

## Solutions That Worked
- Created the two files exactly as specified in the plan's reference structures.
- Verified with grep/python HTML parser instead of a browser (no browser in env):
  title, h1, p text, viewport meta, lang attr, no external resources, balanced CSS braces.

## Things to Avoid
- Don't try to run pnpm tsc/check/IVR on this repo — no project exists; it would just error.

## Files Modified
- about.html (created) — repo root
- about.css (created) — repo root

## Open Questions
- None

## Next Steps
- Done. Files committed.
