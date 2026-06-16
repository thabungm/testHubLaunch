# HubLaunch Lessons Learned

This file persists context across Claude sessions. Update it as you work.

## Current Status
- Phase: COMPLETE — security audit done, fixes applied, PR being opened.
- Last action: Fixed insecure temp files; committed on branch.
- Blockers: None.

## Key Discoveries
- This repo is the HubLaunch/Ralph **automation framework itself** — there is NO
  pnpm/Node app, no package.json, no IVR simulator, no `src/`. So the ralph.md
  verification steps (`pnpm tsc`, `pnpm check`, `pnpm ivr:sim`) DO NOT APPLY here.
  Don't waste time looking for them.
- Auditable code = shell scripts (`ralph-run.sh` 3269 lines, `.github/scripts/*.sh`)
  + one TS hook (`.hublaunch/hooks/deploymentStartupScript.ts`).
- ENTRY_POINT=./  OUTCOME_TYPE=pr.

## Findings (severity)
- **MEDIUM — Insecure temp files (CWE-377)** in `.github/scripts/hula-verify-gather.sh`
  (`/tmp/hula-verify-diff-<PR>.patch`) and `hula-verify-post.sh`
  (`/tmp/hula-verify-comment-<PR>.md`). Predictable, sequential PR-number paths in
  world-writable /tmp → symlink/TOCTOU clobber of victim files + private-repo diff
  left readable in /tmp. **FIXED** → switched to `mktemp` (0600, unpredictable) +
  `trap ... EXIT` cleanup in post.
- LOW (reported, not fixed — needs design decision / trusted input):
  - `deploymentStartupScript.ts`: `JSON.parse(process.argv[2])` no try/catch; fills
    TEST_USER_EMAIL/PASSWORD into whatever `deploymentUrl` is passed — no host
    allowlist. Input is server-provided (trusted), so left as-is.
  - `ralph-run.sh` `eval "$CMD"` on REGRESSION_COMMANDS — sourced from the plan
    markdown (author-controlled config), intended behavior, not external injection.
  - sed-based `json_escape` in the .sh scripts doesn't escape raw control chars
    (python3/jq path does). Defense-in-depth only.
- No hard-coded secrets found (all creds come from env vars). Auth headers/tokens
  handled via env, not committed.

## Solutions That Worked
- `DIFF_FILE=$(mktemp "${TMPDIR:-/tmp}/hula-verify-diff-${PR_NUMBER}-XXXXXX.patch")`
  keeps the same "return path in JSON" contract but with a safe file.
- Verified with `bash -n` (syntax) + isolated mktemp smoke test (0600 perms).

## Things to Avoid
- Don't run pnpm/tsc here — no Node project exists.

## Files Modified
- .github/scripts/hula-verify-gather.sh
- .github/scripts/hula-verify-post.sh

## Next Steps
- Commit on branch `harden/security-audit-2026-06-16`, open PR.
