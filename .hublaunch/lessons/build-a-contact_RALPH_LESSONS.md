# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE ✅
- Last action: All ACs verified; typecheck/build/regression pass; HTML well-formed; no secret leak
- Blockers: None. SLACK_URL IS set in this container — live send returns HTTP 200.

## Key Discoveries
- Plan: add `scripts/contact-demo.ts` + `package.json` script `contact:demo` + README section.
- Reuse exports from `./contact.ts`: submitContactForm, buildSlackPayload, validateContact, ContactValidationError, type ContactInput.
- tsconfig: strict, verbatimModuleSyntax, allowImportingTsExtensions → must use explicit `.ts` ext and `type` for type-only imports. noUnusedLocals NOT set, so unused imports won't fail typecheck (but avoid anyway).
- buildSlackPayload structure: {text, blocks:[header, section(fields Name/Email), section(Message)]}; header "📬 New Contact: "+subject sliced 150; message body sliced 2900; esc &<>.
- submitContactForm throws literal "SLACK_URL environment variable is not set" when unset (safe, no secret).
- Check cmd: `npm run typecheck`. Regression: `npm run contact`, `npm run test:contact`. build = tsc --noEmit wrapper.

## Gotchas when embedding client JS in outer template literal
- Regex `\s` `\.` must be written `\\s` `\\.` in the Node template literal.
- Client string `"\n"` must be written `\\n` so generated file keeps the escape.
- Avoid `${` inside client JS (use string concatenation).

## Solutions That Worked
- Client JS embedded in outer template literal: doubled escapes `\\s`/`\\.`/`\\n` survive into the file correctly (verified). Avoided `${` by using string concatenation + JSON.stringify.
- Verified client validation == server validateContact: bad input → "name is required; email is invalid; subject is required; body is required" (4 issues, exact match). Valid input preview == buildSlackPayload (text + 3 blocks header,section,section + "*Name:*\nAda").
- Graceful degradation: `env -u SLACK_URL` → page still written, "Not sent — SLACK_URL environment variable is not set", exit 1; --dry-run → exit 0.
- Added contact-demo.html to .gitignore (per-run generated artifact).

## Things to Avoid
- `npx tsx -e '...'` and temp files in /tmp eval contact.ts as CJS → fails on its top-level-await run guard ("Top-level await not supported with cjs"). Use an in-project temp .ts file (gets "type":"module") or just `npm run` scripts.
- Secret check: grep for "hooks.slack.com" (the host/token), NOT "slack_url" — the literal env-var NAME appears in the safe error string and is expected/safe.

## Files Modified
- scripts/contact-demo.ts (new)
- package.json (added "contact:demo" script)
- README.md (added "Contact Us demo" section)
- .gitignore (ignore contact-demo.html)

## Open Questions
- None.

## Next Steps
- Done. Optionally commit. All ACs (AC1-AC7) satisfied and verified.
