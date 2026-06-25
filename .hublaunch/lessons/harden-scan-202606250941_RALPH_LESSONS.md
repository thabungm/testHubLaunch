# HubLaunch Lessons Learned — Harden security audit (scan ./, OUTCOME_TYPE=pr)

## Current Status
- Phase: COMPLETE — fixes applied, verified, ready for PR
- Last action: Fixed predictable /tmp temp files; all scripts pass `bash -n`

## Key Discoveries
- Repo is a **shell-script** project (no package.json) → `npm/pnpm audit` N/A.
- Scanned: `.github/scripts/*.sh` (8), `.agents/skills/diagnose/scripts/*.sh`, `ralph-run.sh` (3345 lines), markdown/config.
- Codebase is generally well-hardened:
  - `ralph-run.sh` uses `mktemp` consistently; redacts tokens from remote URLs (lines 1278-1280); single-quotes `$GITHUB_TOKEN` in git credential helper (1578-1579); numeric/path-traversal validation.
  - `.github/scripts` use `json_escape`, numeric arg validation (`[0-9]*`), reject `..` path traversal.
- No hard-coded secrets found (grep matches were only token-format comments).

## Findings
- **MEDIUM (CWE-377/CWE-59) Insecure predictable temp files** — FIXED:
  - `.github/scripts/hula-verify-gather.sh:116` — `/tmp/hula-verify-diff-${PR_NUMBER}.patch`
  - `.github/scripts/hula-verify-post.sh:63` — `/tmp/hula-verify-comment-${PR_NUMBER}.md`
  - Risk: predictable paths in world-writable `/tmp` → symlink-following clobber / info disclosure on shared hosts.
  - Fix: replaced with `mktemp "${TMPDIR:-/tmp}/...-XXXXXX..."` (matches ralph-run.sh convention).

## Solutions That Worked
- `mktemp "${TMPDIR:-/tmp}/name-XXXXXX.ext"` — codebase-consistent, unpredictable path; downstream reads returned path so no breakage.

## Things to Avoid
- `eval "$CMD"` in ralph-run.sh (2977/3044) runs repo-controlled regression commands from ralph.md — intended functionality, not a fixable vuln.

## Files Modified
- .github/scripts/hula-verify-gather.sh
- .github/scripts/hula-verify-post.sh

## Verification
- `bash -n` passes for all 10 shell scripts; mktemp template tested live; shellcheck not installed.

## Next Steps
- Commit + open PR `harden: security audit ./ (2026-06-25)`.
