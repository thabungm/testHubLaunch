# HubLaunch Lessons Learned — harden security audit

## Current Status
- Phase: COMPLETE — fixes applied, verified, ready to commit + PR
- Outcome type: pr

## Key Discoveries
- This repo is the HubLaunch tooling itself: bash scripts (.github/scripts/*, ralph-run.sh)
  + skill markdown. No package.json / lockfiles → `npm/pnpm audit` is N/A.
- No hardcoded secrets found (scanned AWS/OpenAI/GitHub/Slack/private-key patterns).
- ralph-run.sh already handles secrets well: sanitizes tokens out of git remote URLs
  (lines ~1275-1280), uses `mktemp` for all its temp files, keeps GITHUB_TOKEN out of
  config via single-quoted credential helper.

## Findings (catalogued)
- MEDIUM — Insecure temporary file usage (CWE-377 / CWE-59, symlink following):
  - `.github/scripts/hula-verify-gather.sh:116` — `/tmp/hula-verify-diff-${PR_NUMBER}.patch`
  - `.github/scripts/hula-verify-post.sh:63`   — `/tmp/hula-verify-comment-${PR_NUMBER}.md`
  Predictable names in world-writable /tmp let a local attacker pre-create a symlink and
  hijack the `>` redirect (overwrite a victim file writable by the runner, or feed tampered
  diff content downstream). Unambiguous → fixed in PR mode.
- No high/critical injection/auth/SSRF issues confirmed. Arg-parsing scripts quote vars,
  use json_escape for JSON embedding, validate path traversal (hula-launch-run.sh),
  and pass user input as positional args to gh (no shell eval).

## Solutions That Worked
- Switched both predictable temp paths to `mktemp "${TMPDIR:-/tmp}/...-XXXXXX.<ext>"`,
  matching the existing pattern in ralph-run.sh:548 (this codebase assumes GNU coreutils
  mktemp with suffix support). Added `|| die 2 ...` guard.

## Things to Avoid
- BSD/macOS mktemp needs X's at end of template; the codebase already relies on GNU
  suffix behavior, so matched that rather than restructuring.

## Files Modified
- .github/scripts/hula-verify-gather.sh (mktemp for DIFF_FILE)
- .github/scripts/hula-verify-post.sh (mktemp for COMMENT_TMP)

## Verification
- `bash -n` passes on all 8 scripts + ralph-run.sh.
- mktemp templates tested live — both create files successfully.
- npm/pnpm audit: N/A (no JS deps).

## Next Steps
- Commit on a branch, open PR titled `harden: security audit ./ (2026-07-03)`.
