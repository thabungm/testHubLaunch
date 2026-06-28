#!/usr/bin/env bash
# hula-fix-setup.sh — Steps 2-6 of the hula.fix workflow
# Usage: bash .github/scripts/hula-fix-setup.sh <issue-number> [--repo-root <path>]
#
# Performs: issue lookup → worktree creation → session file writing
# Outputs structured JSON to stdout; all other output goes to stderr
# Exit codes: 0=success, 1=user error, 2=tool error

set -euo pipefail

# ── helpers ────────────────────────────────────────────────────────────────────

json_escape() {
  # Escape a string for safe embedding inside a JSON double-quoted value
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/g' | tr -d '\n' | sed 's/\\n$//'
}

die() {
  local code="$1"; shift
  local safe_msg
  safe_msg=$(json_escape "$*")
  printf '{"status":"error","code":%d,"message":"%s"}\n' "$code" "$safe_msg" >&1
  exit "$code"
}

emit_json() {
  # emit_json key value [key value ...]  — values are already JSON-safe strings
  local out='{'
  local sep=''
  while [[ $# -ge 2 ]]; do
    local k="$1" v="$2"; shift 2
    out="${out}${sep}\"${k}\":\"${v}\""
    sep=','
  done
  printf '%s}\n' "$out"
}

# ── argument parsing ────────────────────────────────────────────────────────────

ISSUE_NUMBER=''
REPO_ROOT=''

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-root)
      REPO_ROOT="$2"; shift 2 ;;
    --repo-root=*)
      REPO_ROOT="${1#--repo-root=}"; shift ;;
    [0-9]*)
      ISSUE_NUMBER="$1"; shift ;;
    *)
      die 1 "Unknown argument: $1" ;;
  esac
done

if [[ -z "$ISSUE_NUMBER" ]]; then
  die 1 "Usage: bash .github/scripts/hula-fix-setup.sh <issue-number> [--repo-root <path>]"
fi

# Strict numeric validation. The case glob [0-9]* only checks the FIRST char,
# so a value like '1") | env' would pass and be interpolated into the jq program
# string below and emitted as raw JSON. Require a pure integer to prevent injection.
if [[ ! "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
  die 1 "Invalid issue number (must be a positive integer): ${ISSUE_NUMBER}"
fi

if [[ -n "$REPO_ROOT" ]]; then
  cd "$REPO_ROOT"
fi

# ── Step 1: Infer owner/repo and repo name from git remote ─────────────────────

NAME_WITH_OWNER=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null) \
  || die 2 "Failed to determine repo from git remote. Is this a GitHub repo?"

REPO_NAME=$(gh repo view --json name -q '.name' 2>/dev/null) \
  || die 2 "Failed to determine repo name."

# ── Step 2: Fetch issue details ────────────────────────────────────────────────

ISSUE_JSON=$(gh issue view "$ISSUE_NUMBER" --json title,body,labels 2>/dev/null) \
  || die 1 "Issue #${ISSUE_NUMBER} not found or not accessible."

ISSUE_TITLE=$(printf '%s' "$ISSUE_JSON" | grep -o '"title":"[^"]*"' | head -1 | sed 's/"title":"//;s/"$//')

# ── Step 3: Validate issue is tracked and has a PR (via hula view) ─────────────

HULA_VIEW=$(hula view 2>&1) || true

if printf '%s' "$HULA_VIEW" | grep -qi "not tracked\|no issues"; then
  die 1 "Issue #${ISSUE_NUMBER} is not tracked. Run: hula track ${ISSUE_NUMBER}"
fi

# ── Step 4: Find PR branch for the issue ──────────────────────────────────────

PR_BRANCH=$(gh pr list --search "linked:${ISSUE_NUMBER}" --json headRefName -q '.[0].headRefName' 2>/dev/null) || true

if [[ -z "$PR_BRANCH" ]]; then
  # Fallback: search PR bodies for issue references
  # Handles both short format (#N) and full-path format (owner/repo#N)
  # Uses gh's built-in jq (-q) — no external jq required
  JQ_EXPR='.[] | select(.body != null) | select(.body | test("(Fixes|Closes|Resolves)[ ]+([A-Za-z0-9._-]+/[A-Za-z0-9._-]+)?#'"${ISSUE_NUMBER}"'([^0-9]|$)|(^|[^0-9])#'"${ISSUE_NUMBER}"'([^0-9]|$)"; "i")) | .headRefName'
  PR_BRANCH=$(gh pr list --json headRefName,body --limit 100 -q "$JQ_EXPR" 2>/dev/null | head -1) || true
fi

if [[ -z "$PR_BRANCH" ]]; then
  die 1 "No PR found for issue #${ISSUE_NUMBER}. Create a PR first with: hula checkout ${ISSUE_NUMBER}"
fi

# ── Step 5: Determine worktree path ───────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/hula-read-config.sh"
WORKTREE_PATH="${HULA_WORKTREE_BASE_PATH}/hula/${REPO_NAME}/fix-${ISSUE_NUMBER}"

# ── Step 6: Create or reuse the worktree ─────────────────────────────────────

WORKTREE_STATUS='reused'

if git worktree list --porcelain 2>/dev/null | grep -qxF "worktree ${WORKTREE_PATH}"; then
  printf 'ℹ️  Resuming existing fix worktree at %s\n' "$WORKTREE_PATH" >&2
else
  printf '🌳 Creating fix worktree at: %s\n' "$WORKTREE_PATH" >&2
  git fetch origin >&2 2>&1 || die 2 "git fetch origin failed"
  git worktree add "$WORKTREE_PATH" "$PR_BRANCH" >&2 2>&1 \
    || die 2 "Failed to create worktree at ${WORKTREE_PATH}. Check that branch ${PR_BRANCH} exists."
  WORKTREE_STATUS='created'
fi

# ── Step 7: Write session file ────────────────────────────────────────────────

REPO_ROOT_SESSION=$(git rev-parse --show-toplevel 2>/dev/null) || REPO_ROOT_SESSION="$(pwd)"
SESSION_DIR="${REPO_ROOT_SESSION}/.hublaunch/.fix-sessions"
mkdir -p "$SESSION_DIR"

STARTED_AT=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%SZ")

SESSION_FILE="${SESSION_DIR}/issue-${ISSUE_NUMBER}.json"
SAFE_WT_SESSION=$(json_escape "$WORKTREE_PATH")
SAFE_BR_SESSION=$(json_escape "$PR_BRANCH")
printf '{\n  "issueNumber": %s,\n  "worktreePath": "%s",\n  "prBranch": "%s",\n  "startedAt": "%s"\n}\n' \
  "$ISSUE_NUMBER" "$SAFE_WT_SESSION" "$SAFE_BR_SESSION" "$STARTED_AT" > "$SESSION_FILE"

# ── Output result ─────────────────────────────────────────────────────────────

SAFE_TITLE=$(json_escape "$ISSUE_TITLE")
SAFE_BRANCH=$(json_escape "$PR_BRANCH")
SAFE_WORKTREE=$(json_escape "$WORKTREE_PATH")
SAFE_SESSION=$(json_escape "$SESSION_FILE")

printf '{"status":"success","issueNumber":%s,"issueTitle":"%s","prBranch":"%s","worktreePath":"%s","sessionFile":"%s","worktreeStatus":"%s"}\n' \
  "$ISSUE_NUMBER" "$SAFE_TITLE" "$SAFE_BRANCH" "$SAFE_WORKTREE" "$SAFE_SESSION" "$WORKTREE_STATUS"
