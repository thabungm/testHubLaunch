#!/usr/bin/env bash
# hula-merge-local.sh — Path A of the hula.merge workflow (local session merge)
# Usage: bash .github/scripts/hula-merge-local.sh <issue-number> <worktree-path> <commit-message> [--skip-tests] [--dry-run]
#
# Performs: commit + push from worktree → hula merge → remove worktree → delete session file
# Outputs structured JSON to stdout; all other output goes to stderr.
# Exit codes: 0=success, 1=user error, 2=tool error

set -euo pipefail

# ── helpers ────────────────────────────────────────────────────────────────────

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/g' | tr -d '\n' | sed 's/\\n$//'
}

die() {
  local code="$1"; shift
  local safe_msg
  safe_msg=$(json_escape "$*")
  printf '{"status":"error","code":%d,"message":"%s"}\n' "$code" "$safe_msg" >&1
  exit "$code"
}

# ── argument parsing ────────────────────────────────────────────────────────────

ISSUE_NUMBER=''
WORKTREE_PATH=''
COMMIT_MSG=''
SKIP_TESTS=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-tests) SKIP_TESTS=true; shift ;;
    --dry-run)    DRY_RUN=true;    shift ;;
    *)
      if [[ -z "$ISSUE_NUMBER" ]]; then
        ISSUE_NUMBER="$1"
      elif [[ -z "$WORKTREE_PATH" ]]; then
        WORKTREE_PATH="$1"
      elif [[ -z "$COMMIT_MSG" ]]; then
        COMMIT_MSG="$1"
      else
        die 1 "Unexpected argument: $1"
      fi
      shift ;;
  esac
done

if [[ -z "$ISSUE_NUMBER" || -z "$WORKTREE_PATH" || -z "$COMMIT_MSG" ]]; then
  die 1 "Usage: bash .github/scripts/hula-merge-local.sh <issue-number> <worktree-path> <commit-message> [--skip-tests] [--dry-run]"
fi

# Validate issue number is numeric — it is embedded unquoted in JSON output and used
# to build file paths, so reject anything non-numeric (prevents JSON/path injection).
if [[ ! "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
  die 1 "Invalid issue number: ${ISSUE_NUMBER}. Must be a positive integer."
fi

if [[ ! -d "$WORKTREE_PATH" ]]; then
  die 1 "Worktree not found at ${WORKTREE_PATH}."
fi

# Compute absolute session file path before cd (so it resolves correctly later)
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || REPO_ROOT="$(pwd)"
SESSION_FILE="${REPO_ROOT}/.hublaunch/.fix-sessions/issue-${ISSUE_NUMBER}.json"

# ── Step A3: Commit and push from worktree ────────────────────────────────────

cd "$WORKTREE_PATH"

PORCELAIN=$(git status --porcelain 2>/dev/null)
COMMITTED=false
FILES_CHANGED=0

if [[ -n "$PORCELAIN" ]]; then
  FILES_CHANGED=$(printf '%s' "$PORCELAIN" | grep -c '' || true)

  if [[ "$DRY_RUN" == false ]]; then
    git add -A >&2 2>&1 \
      || die 2 "git add failed in worktree ${WORKTREE_PATH}"

    git commit -m "$COMMIT_MSG" >&2 2>&1 \
      || die 2 "Failed to commit changes. Ensure git user.name and user.email are configured."

    git push >&2 2>&1 \
      || die 2 "Push failed. Try: cd ${WORKTREE_PATH} && git push"

    COMMITTED=true
  else
    printf '🔍 Dry run: would commit %d file(s) with message: %s\n' "$FILES_CHANGED" "$COMMIT_MSG" >&2
    COMMITTED=false
  fi
else
  printf 'ℹ️  No changes to commit, proceeding to merge...\n' >&2
fi

# ── Step A4: Merge the PR ─────────────────────────────────────────────────────

# Return to the main repo root (parent of worktree if possible)
cd - > /dev/null 2>&1 || true

if [[ "$DRY_RUN" == false ]]; then
  printf '🔀 Merging PR for issue #%s...\n' "$ISSUE_NUMBER" >&2
  hula merge "$ISSUE_NUMBER" >&2 2>&1 \
    || die 2 "Failed to merge PR for issue #${ISSUE_NUMBER}. Session preserved — run /hula-merge again after resolving."
fi

# ── Step A5: Remove fix worktree ──────────────────────────────────────────────

if [[ "$DRY_RUN" == false ]]; then
  printf '🧹 Removing fix worktree: %s\n' "$WORKTREE_PATH" >&2
  git worktree remove "$WORKTREE_PATH" --force >&2 2>&1 \
    || printf '⚠️  Could not remove worktree at %s (may already be gone)\n' "$WORKTREE_PATH" >&2
fi

# ── Step A6: Clean up session file ───────────────────────────────────────────

SESSION_CLEANED=false

if [[ -f "$SESSION_FILE" ]]; then
  if [[ "$DRY_RUN" == false ]]; then
    rm -f "$SESSION_FILE"
    SESSION_CLEANED=true
    printf '🧹 Cleaned up session file\n' >&2
  else
    printf '🔍 Dry run: would delete session file %s\n' "$SESSION_FILE" >&2
  fi
fi

# ── Output result ─────────────────────────────────────────────────────────────

SAFE_MSG=$(json_escape "$COMMIT_MSG")
SAFE_PATH=$(json_escape "$WORKTREE_PATH")

printf '{"status":"success","issueNumber":%s,"committed":%s,"filesChanged":%d,"worktreeRemoved":%s,"sessionCleaned":%s,"commitMessage":"%s","worktreePath":"%s"}\n' \
  "$ISSUE_NUMBER" \
  "$([ "$COMMITTED" == true ] && echo 'true' || echo 'false')" \
  "$FILES_CHANGED" \
  "$([ "$DRY_RUN" == false ] && echo 'true' || echo 'false')" \
  "$([ "$SESSION_CLEANED" == true ] && echo 'true' || echo 'false')" \
  "$SAFE_MSG" \
  "$SAFE_PATH"
