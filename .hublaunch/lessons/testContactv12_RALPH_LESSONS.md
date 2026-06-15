# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created contact.html + contact.css, verified, committing
- Blockers: None

## Key Discoveries
- This repo (testHubLaunch) is a PLAIN STATIC HTML project — NO package.json.
- The `pnpm tsc --noEmit` / `pnpm check` / IVR verification steps in ralph.md are
  the generic IVR-project template and DO NOT APPLY here — there is nothing for them
  to run against (no package.json, no TS, no IVR). Confirmed pnpm exists but no project.
- Verification approach for static pages: html.parser structural checks + `python3 -m
  http.server` live serve + curl status/content-type checks.

## Solutions That Worked
- Static AC verification via python html.parser: check ids, label `for`/`id` pairing,
  input types, required attrs, title/h1/meta, no external script/CDN.
- NOTE: HTMLParser parses boolean attrs (e.g. `required`) with value None — test with
  `'required' in attrs`, NOT `attrs.get('required') is not None`.
- Live serve: `python3 -m http.server 8099` then curl for 200 + content_type=text/css.

## Things to Avoid
- Don't try to run pnpm checks here — no package.json, they'll just error.

## Files Modified
- contact.html (created, repo root)
- contact.css (created, repo root)

## Open Questions
- None.

## Next Steps
- Done. Plan fully implemented. All 8 acceptance criteria met (AC1-AC8).
- (Future, out of scope) If index.html landing page is later added, link to contact.html.
