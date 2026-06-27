# HubLaunch Lessons Learned — harden-scan-202606270947

Security audit of `./` (OUTCOME_TYPE=pr). Repo is a HubLaunch tooling/skills repo:
shell scripts (`.github/scripts/*.sh`), one TS hook, and markdown skills/plans.

## Current Status
- Phase: COMPLETE ✅
- PR opened: https://github.com/thabungm/testHubLaunch/pull/41
  (branch harden/security-audit-20260627, commit dd45ad6).
- bash -n clean on all 8 scripts. 4 functional tests PASS (validation rejects injection
  payloads, accepts numeric, mktemp creates unique writable file).
- npm/pnpm audit: N/A — no package manifest in repo (noted in PR).
- Scan complete. No hardcoded secrets (all creds via env vars). No package manifests
  → `npm/pnpm audit` is N/A (no dependency tree).

## Key Discoveries / Findings
- **HIGH — Insecure temp files (CWE-377/CWE-59)**: `hula-verify-gather.sh:116`
  (`/tmp/hula-verify-diff-${PR_NUMBER}.patch`) and `hula-verify-post.sh:63`
  (`/tmp/hula-verify-comment-${PR_NUMBER}.md`) use predictable, enumerable filenames in
  a world-writable dir. Symlink attack → arbitrary file overwrite via `>` redirect;
  info disclosure of PR diff/comment to other local users. Project already uses `mktemp`
  in `ralph-run.sh` — fix = adopt same pattern.
- **MEDIUM — Missing input validation**: `hula-merge-local.sh` and `hula-fix-commit.sh`
  take ISSUE_NUMBER as a positional arg with NO numeric check, then emit it unquoted into
  JSON (`"issueNumber":%s`) → JSON injection / malformed output. Sibling scripts
  (gather/fix-setup/merge-remote) already validate `[0-9]*`. Fix = add `^[0-9]+$` check.
- **LOW/INFO (not auto-fixed)**: `deploymentStartupScript.ts` navigates to
  `context.deploymentUrl` (from untrusted JSON arg) then submits TEST_USER creds — no URL
  allowlist; potential credential phishing if URL is attacker-controlled. Left as report
  item (ambiguous fix, test-only creds). Also `JSON.parse` lacks try/catch (crash only).

## Solutions That Worked
- (pending verification)

## Files Modified
- .github/scripts/hula-verify-gather.sh (mktemp)
- .github/scripts/hula-verify-post.sh (mktemp + EXIT trap cleanup)
- .github/scripts/hula-merge-local.sh (ISSUE_NUMBER numeric validation)
- .github/scripts/hula-fix-commit.sh (ISSUE_NUMBER numeric validation)

## Next Steps
- Apply fixes, run `bash -n` syntax check + shellcheck if available, open PR.
