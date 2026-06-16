#!/usr/bin/env bash
# hula-launch-run.sh — Step 4 of the hula.launch workflow
# Usage: bash .github/scripts/hula-launch-run.sh <plan-path> <branch-name> [--handoff <username>]
#
# Performs: hula launch (which handles plan upload automatically)
# Outputs structured JSON to stdout; all other output goes to stderr.
# Exit codes: 0=success, 1=user error, 2=tool error

set -euo pipefail

# ── helpers ────────────────────────────────────────────────────────────────────

json_escape() {
  if command -v jq &>/dev/null; then
    # jq -Rs . reads stdin as a raw string and outputs a JSON string (with surrounding quotes).
    # Strip the surrounding quotes; the escaped content is safe to embed in JSON.
    printf '%s' "$1" | jq -Rs . | sed 's/^"//;s/"$//'
  else
    # Fallback: escape backslashes and double quotes, collapse control chars to spaces
    printf '%s' "$1" \
      | sed 's/\\/\\\\/g; s/"/\\"/g' \
      | tr '\n\r\t' '   '
  fi
}

die() {
  local code="$1"; shift
  local safe_msg
  safe_msg=$(json_escape "$*")
  printf '{"status":"error","code":%d,"message":"%s"}\n' "$code" "$safe_msg" >&1
  exit "$code"
}

# ── argument parsing ────────────────────────────────────────────────────────────

PLAN_PATH=''
BRANCH_NAME=''
HANDOFF=''

while [[ $# -gt 0 ]]; do
  case "$1" in
    --handoff)
      HANDOFF="$2"; shift 2 ;;
    --handoff=*)
      HANDOFF="${1#--handoff=}"; shift ;;
    *)
      if [[ -z "$PLAN_PATH" ]]; then
        PLAN_PATH="$1"
      elif [[ -z "$BRANCH_NAME" ]]; then
        BRANCH_NAME="$1"
      else
        die 1 "Unexpected argument: $1"
      fi
      shift ;;
  esac
done

if [[ -z "$PLAN_PATH" || -z "$BRANCH_NAME" ]]; then
  die 1 "Usage: bash .github/scripts/hula-launch-run.sh <plan-path> <branch-name> [--handoff <username>]"
fi

if [[ ! -f "$PLAN_PATH" ]]; then
  die 1 "Plan file not found: ${PLAN_PATH}"
fi

# Reject paths with directory traversal sequences
if printf '%s' "$PLAN_PATH" | grep -q '\.\.'; then
  die 1 "Invalid plan path (path traversal not allowed): ${PLAN_PATH}"
fi

# ── Step 4: Run hula launch ─────────────────────────────────────────────────

printf '🚀 Launching issue from plan: %s\n' "$PLAN_PATH" >&2

if [[ -n "$HANDOFF" ]]; then
  LAUNCH_OUTPUT=$(hula launch "$BRANCH_NAME" "$PLAN_PATH" --handoff "$HANDOFF" 2>&1) \
    || die 2 "Launch failed: $LAUNCH_OUTPUT"
else
  LAUNCH_OUTPUT=$(hula launch "$BRANCH_NAME" "$PLAN_PATH" 2>&1) \
    || die 2 "Launch failed: $LAUNCH_OUTPUT"
fi

# Extract issue number from CLI output (e.g. "Created issue #42" or "issue #42")
ISSUE_NUMBER=$(printf '%s' "$LAUNCH_OUTPUT" | grep -oE '#[0-9]+' | head -1 | tr -d '#') || true

# ── Output result ─────────────────────────────────────────────────────────────

SAFE_PLAN=$(json_escape "$PLAN_PATH")
SAFE_BRANCH=$(json_escape "$BRANCH_NAME")
SAFE_HANDOFF=$(json_escape "$HANDOFF")
SAFE_OUTPUT=$(json_escape "$LAUNCH_OUTPUT")

printf '{"status":"success","issueNumber":"%s","branchName":"%s","planPath":"%s","handoff":"%s","cliOutput":"%s"}\n' \
  "${ISSUE_NUMBER:-}" \
  "$SAFE_BRANCH" \
  "$SAFE_PLAN" \
  "$SAFE_HANDOFF" \
  "$SAFE_OUTPUT"
