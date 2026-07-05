# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Applied mktemp fix; bash -n OK on all 8 scripts + ralph-run.sh; verified
  mktemp creates mode-0600 unpredictable files. npm/pnpm audit N/A (no manifest).
- Blockers: None

## Key Discoveries
- This repo is HubLaunch tooling, NOT an application. No package.json / src / node_modules.
  => `npm audit` / `pnpm audit` is N/A (no manifest). No dependency vulns to scan.
- User-authored, security-relevant code:
  - `.github/scripts/hula-*.sh` (workflow shell scripts)
  - `.hublaunch/hooks/deploymentStartupScript.ts` (Playwright login hook)
- `ralph.md`/`harden.md` are Hula-team bundled (header says do NOT edit). `ralph-run.sh`
  (3431 lines) is also bundled infra; its `eval "$CMD"` (lines 3063,3130) runs
  user-CONFIGURED regression commands by design — not a fixable vuln, and file is bundled.

## Findings (severity / file:line)
- MEDIUM — Insecure temp file (CWE-377 symlink attack): predictable `/tmp` names created
  with `>` redirection.
  - `.github/scripts/hula-verify-gather.sh:116` DIFF_FILE="/tmp/hula-verify-diff-${PR_NUMBER}.patch"
  - `.github/scripts/hula-verify-post.sh:63`  COMMENT_TMP="/tmp/hula-verify-comment-${PR_NUMBER}.md"
  => FIX: use `mktemp` (O_EXCL, mode 0600). Applied.
- INFO/accepted — `deploymentStartupScript.ts` reads creds from env (good, not hardcoded);
  leaves browser open by design. No change.
- INFO — jq expressions interpolate `${ISSUE_NUMBER}` but it is validated to `[0-9]*` in
  the case-parsing of gather/setup scripts, so no shell/jq injection.
- No hard-coded secrets found. `.env` and `hublaunch.config.js` are gitignored.

## Solutions That Worked
- `mktemp "${TMPDIR:-/tmp}/hula-...-${PR_NUMBER}.XXXXXX"` keeps a recognizable prefix while
  being unpredictable & atomically created.

## Things to Avoid
- Do not edit bundled files (ralph.md, harden.md, ralph-run.sh).
- Do not "fix" `eval "$CMD"` in ralph-run.sh — configured test commands are intended.

## Files Modified
- .github/scripts/hula-verify-gather.sh (mktemp)
- .github/scripts/hula-verify-post.sh (mktemp)

## Next Steps
- bash -n on modified scripts; confirm no syntax errors.
- Note npm/pnpm audit N/A (no manifest).
