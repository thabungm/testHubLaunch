# HubLaunch Lessons Learned — harden-scan-202606300941

Security audit (Harden agent). OUTCOME_TYPE=pr. ENTRY_POINT=./

## Current Status
- Phase: COMPLETE — fixes applied, verified, ready for PR
- Last action: Fixed insecure temp files, validated with bash -n
- Blockers: None

## Key Discoveries
- Repo is the HubLaunch tooling itself: bash scripts + markdown skills. No
  package.json / lockfile / source app -> `npm/pnpm audit` is N/A (no deps).
- Primary attack surface = shell scripts in `.github/scripts/` + `ralph-run.sh`.
- `ralph-run.sh` correctly uses `mktemp` for ALL temp files (good baseline).
- The two `.github/scripts` verify scripts were the ONLY outliers using
  predictable fixed `/tmp` paths.

## Findings
- [MEDIUM] Insecure temp file (CWE-377/CWE-59) — predictable path in world-
  writable /tmp, symlink-attack / info-disclosure risk:
  - `.github/scripts/hula-verify-gather.sh:116` DIFF_FILE  -> FIXED (mktemp)
  - `.github/scripts/hula-verify-post.sh:63`  COMMENT_TMP -> FIXED (mktemp)
- [LOW/informational, NOT fixed] `eval "$CMD"` in ralph-run.sh:2977,3044 runs
  user-configured regression commands (intended execution of user's own config).
- [LOW/informational, NOT fixed] ISSUE_NUMBER not strictly validated as numeric
  in hula-fix-commit.sh / hula-merge-local.sh (catch-all parse); emitted raw into
  JSON. Worst case = malformed JSON, not shell injection (all uses are quoted).
- Skill download (ralph-run.sh:1733) is HTTPS+GitHub-restricted, content is
  markdown fed to Claude (not executed) -> intended behavior, not a vuln.

## Solutions That Worked
- Replace fixed `/tmp/...` with `mktemp "${TMPDIR:-/tmp}/...-XXXXXX.ext"` +
  `|| die 2 "..."`. Matches existing ralph-run.sh convention. mktemp gives 0600.

## Things to Avoid
- Don't "fix" the eval (intended) or refactor unrelated code — minimal targeted fixes.

## Files Modified
- .github/scripts/hula-verify-gather.sh
- .github/scripts/hula-verify-post.sh

## Next Steps
- Open PR titled `harden: security audit ./ (2026-06-30)`.
