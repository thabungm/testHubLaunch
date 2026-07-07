#!/usr/bin/env bash
# hula-merge-remote.sh — Path B of the hula.merge workflow (remote-only merge)
# Usage: bash .github/scripts/hula-merge-remote.sh <issue-number> [--session-path <path>]
#
# Merges the PR directly on GitHub, then optionally cleans up a stale session file.
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
SESSION_PATH=''

while [[ $# -gt 0 ]]; do
  case "$1" in
    --session-path)
      SESSION_PATH="$2"; shift 2 ;;
    --session-path=*)
      SESSION_PATH="${1#--session-path=}"; shift ;;
    [0-9]*)
      ISSUE_NUMBER="$1"; shift ;;
    *)
      die 1 "Unknown argument: $1" ;;
  esac
done

if [[ -z "$ISSUE_NUMBER" ]]; then
  die 1 "Usage: bash .github/scripts/hula-merge-remote.sh <issue-number> [--session-path <path>]"
fi

# ── Step B1: Merge the PR via hula CLI ───────────────────────────────────────

printf '🔀 Merging PR for issue #%s (remote-only)...\n' "$ISSUE_NUMBER" >&2

# Capture the CLI output so we can detect whether the local default branch was
# fast-forwarded, while still surfacing it live to the user (on stderr — stdout
# is reserved for the structured JSON result).
set +e
MERGE_OUTPUT=$(hula merge "$ISSUE_NUMBER" 2>&1)
MERGE_EXIT=$?
set -e

printf '%s\n' "$MERGE_OUTPUT" >&2

if [[ $MERGE_EXIT -ne 0 ]]; then
  die 2 "Failed to merge PR for issue #${ISSUE_NUMBER}. Check the PR on GitHub."
fi

# Detect whether `hula merge` actually fast-forwarded the local default branch.
# The CLI prints "✓ Local <branch> fast-forwarded to origin/<branch>" on success
# and a specific warning (with remediation) on each skip/failure mode.
LOCAL_UPDATED=false
if printf '%s' "$MERGE_OUTPUT" | grep -q "Local.*fast-forwarded"; then
  LOCAL_UPDATED=true
fi

# ── Step B2: Clean up stale session file (if applicable) ─────────────────────

SESSION_CLEANED=false

# Default session file path if not provided (use absolute path so it works from any CWD)
if [[ -z "$SESSION_PATH" ]]; then
  REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || REPO_ROOT="$(pwd)"
  SESSION_PATH="${REPO_ROOT}/.hublaunch/.fix-sessions/issue-${ISSUE_NUMBER}.json"
fi

if [[ -f "$SESSION_PATH" ]]; then
  rm -f "$SESSION_PATH"
  SESSION_CLEANED=true
  printf '🧹 Cleaned up stale session file\n' >&2
fi

# ── Output result ─────────────────────────────────────────────────────────────

printf '{"status":"success","issueNumber":%s,"sessionCleaned":%s,"localUpdated":%s}\n' \
  "$ISSUE_NUMBER" \
  "$([ "$SESSION_CLEANED" == true ] && echo 'true' || echo 'false')" \
  "$([ "$LOCAL_UPDATED" == true ] && echo 'true' || echo 'false')"
