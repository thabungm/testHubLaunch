# HubLaunch Lessons Learned — Harden security audit

## Current Status
- Phase: Fixes applied, verifying
- Target: `./` (whole repo), OUTCOME_TYPE=pr
- Repo is HubLaunch/Hula shell-script tooling (no npm/node source; audit == shell scripts + md)

## Key Discoveries
- No hard-coded secrets found (grep for sk-/ghp_/ghs_/AKIA/PEM/password= all clean).
- ralph-run.sh (3431 lines) uses `mktemp` correctly everywhere for temp files. Good.
- `python3 -c` JSON parsing (ralph-run.sh:819,905) reads via STDIN — no code injection.
- git credential helper (ralph-run.sh:1652) single-quoted so $GITHUB_TOKEN NOT written to disk — good design; minor: helper is unscoped (returns token for any host). Report-only, not fixing (would risk breaking push auth).
- Anthropic key passed as curl `-H` arg (ralph-run.sh:804) → visible in process list. Container-isolated; report-only.

## CONFIRMED FIX (unambiguous, CWE-377/CWE-59 insecure temp file, predictable name)
- `.github/scripts/hula-verify-gather.sh:116` → `DIFF_FILE="/tmp/hula-verify-diff-${PR_NUMBER}.patch"`
- `.github/scripts/hula-verify-post.sh:63` → `COMMENT_TMP="/tmp/hula-verify-comment-${PR_NUMBER}.md"`
- Predictable world-readable /tmp path → symlink clobber + info disclosure on shared host.
- FIX: replace with `mktemp` (mode 600, unpredictable name).

## Solutions That Worked
- `bash -n` for syntax check on shell scripts (no test suite / npm here).

## Things to Avoid
- No `pnpm`/`npm` in this repo — `pnpm audit` N/A; note it in report.

## Files Modified
- .github/scripts/hula-verify-gather.sh
- .github/scripts/hula-verify-post.sh

## Next Steps
- bash -n on modified scripts; open PR titled `harden: security audit ./ (2026-07-04)`.
