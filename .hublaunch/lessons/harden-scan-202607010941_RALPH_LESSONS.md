# HubLaunch Lessons Learned

Security audit (Harden) of the whole repo (`ENTRY_POINT=./`, `OUTCOME_TYPE=pr`).

## Current Status
- Phase: COMPLETE
- Last action: Opened PR #49 (https://github.com/thabungm/testHubLaunch/pull/49)
- Branch: harden/security-audit-20260701
- Blockers: None

## Verification results
- `bash -n` passes on all 8 helper scripts + ralph-run.sh.
- mktemp pattern tested: 0600 perms, unpredictable suffix, cleanup OK.
- No dependency manifest -> npm/pnpm audit N/A.

## Repo shape
- Shell-script project. No package.json/node deps → `npm/pnpm audit` N/A (no manifest).
- Main code: `.github/scripts/hula-*.sh` (8 small scripts), `ralph-run.sh` (3345 lines),
  config in `.vscode/settings.json`, `.gitignore`, `skills-lock.json`, `.agents/skills/*`.

## Key Discoveries (findings)
- **HIGH — Insecure temp files (CWE-377/CWE-59)**:
  - `.github/scripts/hula-verify-gather.sh:116` -> `DIFF_FILE="/tmp/hula-verify-diff-${PR_NUMBER}.patch"`
    (predictable name, world-writable dir; symlink-overwrite + PR-diff info disclosure). Written with `>`.
  - `.github/scripts/hula-verify-post.sh:63` -> `COMMENT_TMP="/tmp/hula-verify-comment-${PR_NUMBER}.md"`
    (same; also leaked on `die` before cleanup).
  - Fix: use `mktemp` (0600, unpredictable) + trap cleanup where the file is transient.
- **INFO / by-design (NOT fixed)**: `ralph-run.sh:2977,3044` `eval "$CMD"` runs regression commands
  from the `RALPH_REGRESSION_COMMANDS` block in repo-controlled `ralph.md`. Trusted input; running shell
  commands is the intended behavior. Changing it would break the feature.
- Credential handling in `ralph-run.sh` reviewed: API/GH tokens read from env, used in auth headers,
  never echoed/logged. Webhook payloads JSON-escaped. Skill downloads over https only. No hard-coded secrets.

## Solutions That Worked
- `mktemp` with trap for secure temp files.

## Things to Avoid
- Don't touch the `eval` regression path — it's intended config-driven execution.

## Files Modified
- .github/scripts/hula-verify-gather.sh
- .github/scripts/hula-verify-post.sh

## Next Steps
- Run `bash -n` syntax check on modified scripts; shellcheck if available.
- Open PR: `harden: security audit ./ (2026-07-01)`.
