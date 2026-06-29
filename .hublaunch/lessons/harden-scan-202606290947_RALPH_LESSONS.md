# HubLaunch Lessons Learned — harden-scan-202606290947

Security audit (Harden agent). ENTRY_POINT=./  OUTCOME_TYPE=pr.

## Current Status
- Phase: DONE — PR #45 opened (harden/security-audit-202606290947).
  https://github.com/thabungm/testHubLaunch/pull/45
- All 10 shell scripts pass `bash -n`. TS edit reviewed. npm audit N/A (no lockfile).
- Repo is HubLaunch/Hula tooling: shell scripts (.github/scripts/*), one TS hook, large ralph-run.sh.
- NO package.json / lockfile -> `npm/pnpm audit` is N/A (no JS dependency tree to audit).
- NO hardcoded secrets found — all matches are env-var references (good practice).

## Key Discoveries (findings)
### Fixing (unambiguous, behavior-preserving):
1. CWE-377 Insecure predictable temp files (Medium)
   - .github/scripts/hula-verify-gather.sh:116  /tmp/hula-verify-diff-${PR_NUMBER}.patch
   - .github/scripts/hula-verify-post.sh:63      /tmp/hula-verify-comment-${PR_NUMBER}.md
   - Predictable paths in world-writable /tmp -> symlink/clobber/info-leak. Fix: mktemp.
2. CWE-20 Unguarded JSON.parse (Low)
   - .hublaunch/hooks/deploymentStartupScript.ts:31  JSON.parse(contextJson) no try/catch -> crash on malformed input. Fix: try/catch.

### Informational (NOT auto-fixing — by design / no safe minimal fix):
- ralph-run.sh:2977,3044 `eval "$CMD"` runs regression/check commands parsed from ralph.md plan block. Operator-authored; eval needed for shell operators. Documented only.
- ralph-run.sh:~1751 fetches remote .md/.txt from GitHub and appends to skill/context file (prompt-injection vector). Bounded to configured action path. Documented only.

## Solutions That Worked
- mktemp "${TMPDIR:-/tmp}/...-${PR_NUMBER}-XXXXXX" with `|| die` (scripts use set -euo pipefail).

## Files Modified
- .github/scripts/hula-verify-gather.sh
- .github/scripts/hula-verify-post.sh
- .hublaunch/hooks/deploymentStartupScript.ts

## Next Steps
- Apply fixes, bash -n syntax check + node --check, commit, open PR titled
  `harden: security audit ./ (2026-06-29)`.
