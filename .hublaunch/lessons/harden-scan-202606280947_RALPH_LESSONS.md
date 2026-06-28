# HubLaunch Lessons Learned — Harden Security Audit

## Current Status
- Phase: DONE — fixes applied & verified; opening PR
- Last action: All 6 scripts patched, `bash -n` clean, injection payloads rejected, valid inputs pass
- Blockers: None
- Verification: `bash -n` OK for all scripts; `1") | env`, `5; rm -rf /`, `abc` all rejected; valid `42` passes gate.
  Dependency audit N/A (no package.json/lockfile).

## Project Shape
- Shell-script tooling repo (HubLaunch/Hula). No package.json / lockfile → `npm/pnpm audit` is N/A (no JS dependency tree).
- Code surface: `.github/scripts/hula-*.sh` (8 scripts) + `ralph-run.sh` (3345 lines) + skill markdown.
- Inputs that can be untrusted: issue/PR numbers, commit messages, branch names, GitHub-sourced data.

## Findings
### FIXING (unambiguous, medium severity)
1. **Insecure predictable temp files (CWE-377/CWE-59)** — symlink/overwrite risk in `/tmp`.
   - `hula-verify-gather.sh:116` `/tmp/hula-verify-diff-${PR_NUMBER}.patch` (`>` redirect follows symlinks).
   - `hula-verify-post.sh:63` `/tmp/hula-verify-comment-${PR_NUMBER}.md`.
   - `ralph-run.sh` already uses `mktemp` everywhere → these two are the inconsistency. Fix: `mktemp`.
2. **Insufficient numeric validation of issue/PR numbers → jq/JSON injection (CWE-20/CWE-94)**.
   - Glob `[0-9]*` matches any string STARTING with a digit (trailing arbitrary). Confirmed: `1") | env` matches.
   - Interpolated into a `jq` program string `test("...#${ISSUE_NUMBER}...")` in `hula-fix-setup.sh:95`,
     `hula-verify-gather.sh:64` → jq injection (env/`$ENV` can leak tokens).
   - Emitted as raw JSON `%s` and used in file paths in `hula-fix-commit.sh`, `hula-merge-local.sh`
     (ISSUE_NUMBER there is fully unvalidated positional).
   - Affected: fix-setup, merge-remote, verify-gather, verify-post (glob) + fix-commit, merge-local (no validation).
   - Fix: strict `^[0-9]+$` validation in every script after arg parse.

### NOT CHANGING (by-design / low)
- `eval "$CMD"` at `ralph-run.sh:2977,3044` — runs repo-owner-configured regression commands. By design; changing
  semantics would break legitimate multi-word commands. Documented, not a vuln from external input.
- `json_escape` (sed) doesn't escape raw control chars — cosmetic invalid-JSON, not an injection (quotes/backslash
  ARE escaped). Low.
- Secret handling in `ralph-run.sh` reviewed: tokens stripped from remote URLs (1277-1280), correct auth headers,
  no token logging. OK.
- `.vscode/settings.json` terminal autoApprove + `.hublaunch/hooks/README.md` placeholder passwords — not secrets.

## Files Modified
- (pending) .github/scripts/hula-verify-gather.sh
- (pending) .github/scripts/hula-verify-post.sh
- (pending) .github/scripts/hula-fix-setup.sh
- (pending) .github/scripts/hula-merge-remote.sh
- (pending) .github/scripts/hula-fix-commit.sh
- (pending) .github/scripts/hula-merge-local.sh

## Next Steps
COMPLETE. PR opened: https://github.com/thabungm/testHubLaunch/pull/43
Branch: harden/security-audit-2026-06-28. All fixes applied, verified, committed, pushed, PR raised.
