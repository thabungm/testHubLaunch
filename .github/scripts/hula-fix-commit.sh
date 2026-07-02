#!/usr/bin/env bash
# hula-fix-commit.sh — Step 9 of the hula.fix workflow
# Usage: bash .github/scripts/hula-fix-commit.sh <issue-number> <commit-message> [--worktree-path <path>]
#
# Performs: git add -A → git commit → git push from within the fix worktree
# Outputs structured JSON to stdout; all other output goes to stderr
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
COMMIT_MSG=''
WORKTREE_PATH=''

while [[ $# -gt 0 ]]; do
  case "$1" in
    --worktree-path)
      WORKTREE_PATH="$2"; shift 2 ;;
    --worktree-path=*)
      WORKTREE_PATH="${1#--worktree-path=}"; shift ;;
    *)
      if [[ -z "$ISSUE_NUMBER" ]]; then
        ISSUE_NUMBER="$1"
      elif [[ -z "$COMMIT_MSG" ]]; then
        COMMIT_MSG="$1"
      else
        die 1 "Unexpected argument: $1"
      fi
      shift ;;
  esac
done

if [[ -z "$ISSUE_NUMBER" ]]; then
  die 1 "Usage: bash .github/scripts/hula-fix-commit.sh <issue-number> <commit-message> [--worktree-path <path>]"
fi

if [[ -z "$COMMIT_MSG" ]]; then
  die 1 "Commit message is required."
fi

# Enforce a strictly numeric issue number. It is used to build filesystem paths
# (session file / worktree), so a non-numeric value would allow path traversal.
if [[ ! "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
  die 1 "Invalid issue number (must be a positive integer): ${ISSUE_NUMBER}"
fi

# ── Resolve worktree path ─────────────────────────────────────────────────────

if [[ -z "$WORKTREE_PATH" ]]; then
  # Try to read from session file (use absolute path so it works from any CWD)
  REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || REPO_ROOT="$(pwd)"
  SESSION_FILE="${REPO_ROOT}/.hublaunch/.fix-sessions/issue-${ISSUE_NUMBER}.json"
  if [[ -f "$SESSION_FILE" ]]; then
    WORKTREE_PATH=$(grep '"worktreePath"' "$SESSION_FILE" | sed 's/.*"worktreePath":"\([^"]*\)".*/\1/')
  fi
fi

if [[ -z "$WORKTREE_PATH" ]]; then
  # Last resort: infer from repo name using config
  REPO_NAME=$(gh repo view --json name -q '.name' 2>/dev/null) || die 2 "Failed to determine repo name."
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  source "${SCRIPT_DIR}/hula-read-config.sh"
  WORKTREE_PATH="${HULA_WORKTREE_BASE_PATH}/hula/${REPO_NAME}/fix-${ISSUE_NUMBER}"
fi

if [[ ! -d "$WORKTREE_PATH" ]]; then
  die 1 "Worktree not found at ${WORKTREE_PATH}. Run hula-fix-setup.sh first."
fi

# ── Check for changes ─────────────────────────────────────────────────────────

cd "$WORKTREE_PATH"

PORCELAIN=$(git status --porcelain 2>/dev/null)

if [[ -z "$PORCELAIN" ]]; then
  printf '{"status":"success","message":"Nothing to commit","filesChanged":0,"worktreePath":"%s"}\n' \
    "$(json_escape "$WORKTREE_PATH")"
  exit 0
fi

FILES_CHANGED=$(printf '%s' "$PORCELAIN" | grep -c '' || true)

# ── Stage, commit, push ───────────────────────────────────────────────────────

git add -A >&2 2>&1 || die 2 "git add failed"

git commit -m "$COMMIT_MSG" >&2 2>&1 \
  || die 2 "Failed to commit changes. Ensure git user.name and user.email are configured."

git push >&2 2>&1 \
  || die 2 "Push failed. Try: cd ${WORKTREE_PATH} && git push"

# ── Output result ─────────────────────────────────────────────────────────────

SAFE_MSG=$(json_escape "$COMMIT_MSG")
SAFE_PATH=$(json_escape "$WORKTREE_PATH")

printf '{"status":"success","commitMessage":"%s","filesChanged":%d,"worktreePath":"%s"}\n' \
  "$SAFE_MSG" "$FILES_CHANGED" "$SAFE_PATH"
