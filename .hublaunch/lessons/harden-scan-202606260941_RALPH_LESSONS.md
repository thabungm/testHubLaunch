# HubLaunch Lessons Learned — harden-scan-202606260941

Security audit (Harden), ENTRY_POINT=./, OUTCOME_TYPE=pr.

## Current Status
- Phase: DONE — fixes applied & verified, opening PR
- Repo is HubLaunch/Hula tooling: shell scripts in .github/scripts/, one TS hook.
- No package.json / lockfiles anywhere -> npm/pnpm audit N/A (no dependency tree).
- No hardcoded secrets in project source. ralph-run.sh/ralph.md/harden.md/test are
  untracked harness artifacts (not part of repo) -> out of audit scope.

## Key Discoveries (Findings)
1. [MEDIUM] Insecure predictable temp files (symlink/TOCTOU + info disclosure):
   - hula-verify-gather.sh:116  DIFF_FILE="/tmp/hula-verify-diff-${PR_NUMBER}.patch"
   - hula-verify-post.sh:63     COMMENT_TMP="/tmp/hula-verify-comment-${PR_NUMBER}.md"
   Predictable names in world-writable /tmp; attacker can pre-place symlink ->
   arbitrary file overwrite, or read another user's PR diff. FIX: mktemp.
2. [LOW/MED] ISSUE_NUMBER/PR_NUMBER weak/missing validation:
   - fix-commit.sh, merge-local.sh, launch-run.sh: ISSUE_NUMBER from catch-all,
     NOT validated numeric -> emitted unquoted into JSON ("issueNumber":%s) =
     JSON injection, and used in path issue-${N}.json = path traversal.
   - setup/remote/verify-gather/verify-post use `case [0-9]*)` which is a GLOB
     ("starts with digit"), so "12; foo" / "12../.." still match. Weak.
   FIX: strict `^[0-9]+$` regex validation everywhere.
3. [INFO] deploymentStartupScript.ts JSON.parse(argv) unvalidated — low risk
   (local invocation), creds via env (correct). No fix needed.

## Solutions That Worked
- mktemp "${TMPDIR:-/tmp}/...XXXXXX" for finding #1 (both verify scripts).
- `if [[ ! "$N" =~ ^[0-9]+$ ]]; then die 1 ...; fi` after the required-arg check,
  for finding #2. Added to: fix-commit, fix-setup, merge-local, merge-remote,
  verify-gather, verify-post. (launch-run derives the number via grep '#[0-9]+'
  and emits it quoted, so it needed no change.)
- Verified: bash -n all clean; smoke tests reject "12; rm -rf /", "../../etc",
  "5abc" and accept "42"; mktemp pattern creates+removes fine.
- Dependency audit (npm/pnpm): N/A — no package.json/lockfile in repo.

## Files Modified
- .github/scripts/hula-verify-gather.sh (mktemp + numeric guard)
- .github/scripts/hula-verify-post.sh  (mktemp + numeric guard)
- .github/scripts/hula-fix-commit.sh   (numeric guard)
- .github/scripts/hula-fix-setup.sh    (numeric guard)
- .github/scripts/hula-merge-local.sh  (numeric guard)
- .github/scripts/hula-merge-remote.sh (numeric guard)

## Next Steps
- COMPLETE. Branch harden/security-audit-20260626 pushed.
- PR: https://github.com/thabungm/testHubLaunch/pull/39
  ("harden: security audit ./ (2026-06-26)")
