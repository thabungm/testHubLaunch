#!/usr/bin/env bash
# hula-verify-post.sh — Step 8 of the hula.verify workflow
# Usage: bash .github/scripts/hula-verify-post.sh <pr-number> <report-file>
#
# Posts a verification report as a PR comment mentioning @copilot.
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

PR_NUMBER=''
REPORT_FILE=''

while [[ $# -gt 0 ]]; do
  case "$1" in
    [0-9]*)
      if [[ -z "$PR_NUMBER" ]]; then
        PR_NUMBER="$1"
      else
        die 1 "Unexpected positional argument: $1"
      fi
      shift ;;
    *)
      if [[ -z "$REPORT_FILE" ]]; then
        REPORT_FILE="$1"
      else
        die 1 "Unknown argument: $1"
      fi
      shift ;;
  esac
done

if [[ -z "$PR_NUMBER" ]]; then
  die 1 "Usage: bash .github/scripts/hula-verify-post.sh <pr-number> <report-file>"
fi

if [[ -z "$REPORT_FILE" ]]; then
  die 1 "Report file path is required as second argument."
fi

# Enforce a strictly-numeric PR number (the `[0-9]*` glob only checks the first
# character) to prevent JSON injection in the emitted output.
if [[ ! "$PR_NUMBER" =~ ^[0-9]+$ ]]; then
  die 1 "Invalid PR number: must be a positive integer."
fi

if [[ ! -f "$REPORT_FILE" ]]; then
  die 1 "Report file not found: ${REPORT_FILE}"
fi

# ── Build comment body with @copilot mention ──────────────────────────────────

# Use mktemp to avoid predictable paths in world-writable /tmp (symlink/TOCTOU).
COMMENT_TMP=$(mktemp "${TMPDIR:-/tmp}/hula-verify-comment-${PR_NUMBER}.XXXXXX") \
  || die 2 "Failed to create temporary comment file."

{
  printf '@copilot Please review this verification report and address any gaps.\n\n'
  cat "$REPORT_FILE"
} > "$COMMENT_TMP"

# ── Post comment ──────────────────────────────────────────────────────────────

printf '📝 Posting verification report to PR #%s...\n' "$PR_NUMBER" >&2

COMMENT_URL=$(gh pr comment "$PR_NUMBER" --body-file "$COMMENT_TMP" 2>/dev/null) \
  || die 2 "Failed to post comment to PR #${PR_NUMBER}. You can copy the report manually."

rm -f "$COMMENT_TMP"

# ── Output result ─────────────────────────────────────────────────────────────

SAFE_URL=$(json_escape "${COMMENT_URL:-}")

printf '{"status":"success","prNumber":%s,"commentUrl":"%s"}\n' \
  "$PR_NUMBER" "$SAFE_URL"
