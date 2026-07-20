# HubLaunch Lessons — harden-scan-202607020941

Security audit (Harden). ENTRY_POINT=./  OUTCOME_TYPE=pr

## Current Status
- Phase: COMPLETE ✅  PR: https://github.com/thabungm/testHubLaunch/pull/91
- Branch: harden/security-audit-20260702  Commit: b2b0738
- Verified: bash -n on all 8 scripts; injection payloads rejected; URL gate logic (node) passes.
- npm/pnpm audit N/A (no package.json/lockfile).
- Repo is HubLaunch tooling: bash scripts under .github/scripts, one TS hook, markdown skills.
- No package.json / lockfile → `npm/pnpm audit` N/A (no dependency manifest). Note in report.
- gh authenticated (thabungm), remote origin https://github.com/thabungm/testHubLaunch.git

## Findings
1. [HIGH] jq-expression + JSON-output injection via unvalidated ISSUE_NUMBER/PR_NUMBER.
   - `.github/scripts/hula-verify-gather.sh:64` and `hula-fix-setup.sh:95` interpolate
     ${ISSUE_NUMBER} into a jq program string. Arg parsing uses glob `[0-9]*` (only first
     char must be a digit) → suffix injection possible → jq expression injection.
   - Raw (unquoted) `%s` emission of ISSUE_NUMBER/PR_NUMBER into structured JSON stdout
     (hula-merge-local.sh:132, hula-verify-gather.sh:131, hula-merge-remote.sh:73,
     hula-verify-post.sh:83, hula-fix-setup.sh:135/145) → JSON injection into server-parsed output.
   - fix-commit.sh / merge-local.sh accept ISSUE_NUMBER positionally with NO numeric check.
   - FIX: strict `^[0-9]+$` validation right after the required-arg check in every script.
2. [MEDIUM] deploymentStartupScript.ts navigates to context.deploymentUrl with no scheme
   validation, then fills TEST_USER_EMAIL/PASSWORD into the page → credentials could be sent
   to a file://, javascript:, or attacker http URL. FIX: require http/https before goto.
3. [LOW report-only] .vscode/settings.json auto-approves `rm -f`, `git push`, `git commit`.
4. [LOW report-only] json_escape() doesn't escape control chars (tab/CR) → can emit invalid JSON.

## Files Modified
- (in progress)

## Next Steps
- Apply fixes 1 & 2, verify scripts still parse (bash -n), commit, open PR.
