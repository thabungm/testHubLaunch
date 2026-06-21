#!/usr/bin/env bash
# hula-execute-run.sh — runs the hula.execute workflow for the /hula-execute skill
# Usage:
#   bash .github/scripts/hula-execute-run.sh \
#     (--built-in <name> | --action-path <path>) \
#     [--entry-point <path>] [--outcome-type <pr|plan|feedback>] [--schedule "<cron>"]
#
# Performs: hula execute (one-off run, or a recurring schedule when --schedule is given).
# Outputs a single structured JSON object to stdout; all other output goes to stderr.
#
# JSON contract (stdout):
#   one-off run : {"status":"success","kind":"run","runId":"…","prUrl":"…","cliOutput":"…"}
#   schedule    : {"status":"success","kind":"schedule","scheduleId":"…","cronExpr":"…","cliOutput":"…"}
#   failure     : {"status":"error","code":<n>,"message":"…"}
#
# Exit codes: 0=success, 1=user error, 2=tool error
#
# Security: never prints secrets. Credentials are resolved inside the CLI from
# flags/config/env — they are NOT passed by this script.

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

BUILT_IN=''
ACTION_PATH=''
ENTRY_POINT=''
OUTCOME_TYPE=''
SCHEDULE=''

while [[ $# -gt 0 ]]; do
  case "$1" in
    --built-in)        BUILT_IN="$2"; shift 2 ;;
    --built-in=*)      BUILT_IN="${1#--built-in=}"; shift ;;
    --action-path)     ACTION_PATH="$2"; shift 2 ;;
    --action-path=*)   ACTION_PATH="${1#--action-path=}"; shift ;;
    --entry-point)     ENTRY_POINT="$2"; shift 2 ;;
    --entry-point=*)   ENTRY_POINT="${1#--entry-point=}"; shift ;;
    --outcome-type)    OUTCOME_TYPE="$2"; shift 2 ;;
    --outcome-type=*)  OUTCOME_TYPE="${1#--outcome-type=}"; shift ;;
    --schedule)        SCHEDULE="$2"; shift 2 ;;
    --schedule=*)      SCHEDULE="${1#--schedule=}"; shift ;;
    *)                 die 1 "Unexpected argument: $1" ;;
  esac
done

# Exactly one of --built-in / --action-path is required.
if [[ -n "$BUILT_IN" && -n "$ACTION_PATH" ]]; then
  die 1 "Provide either --built-in or --action-path, not both."
fi
if [[ -z "$BUILT_IN" && -z "$ACTION_PATH" ]]; then
  die 1 "Usage: bash .github/scripts/hula-execute-run.sh (--built-in <name> | --action-path <path>) [--entry-point <path>] [--outcome-type <pr|plan|feedback>] [--schedule \"<cron>\"]"
fi

# Reject directory-traversal in --action-path, except for https:// URLs.
if [[ -n "$ACTION_PATH" ]] && [[ "$ACTION_PATH" != https://* ]]; then
  if printf '%s' "$ACTION_PATH" | grep -q '\.\.'; then
    die 1 "Invalid action path (path traversal not allowed): ${ACTION_PATH}"
  fi
fi

# ── Run hula execute ─────────────────────────────────────────────────────────

ARGS=()
if [[ -n "$BUILT_IN" ]]; then
  ARGS+=(--built-in "$BUILT_IN")
else
  ARGS+=(--action-path "$ACTION_PATH")
fi
[[ -n "$ENTRY_POINT" ]]  && ARGS+=(--entry-point "$ENTRY_POINT")
[[ -n "$OUTCOME_TYPE" ]] && ARGS+=(--outcome-type "$OUTCOME_TYPE")
[[ -n "$SCHEDULE" ]]     && ARGS+=(--schedule "$SCHEDULE")

if [[ -n "$SCHEDULE" ]]; then
  printf '⏰ Scheduling execute-action (%s)...\n' "$SCHEDULE" >&2
else
  printf '🚀 Running execute-action...\n' >&2
fi

OUTPUT=$(hula execute "${ARGS[@]}" 2>&1) || die 2 "Execute failed: $OUTPUT"

# ── Parse identifiers from the human-readable CLI output ─────────────────────
# Parsing is intentionally tolerant: a missing identifier becomes an empty
# string and we still report success, falling back to the raw cliOutput.

# Distinguish a schedule from a one-off run by the CLI's success banner.
if printf '%s' "$OUTPUT" | grep -q 'Schedule created successfully'; then
  KIND='schedule'
elif printf '%s' "$OUTPUT" | grep -q 'Execute action queued successfully'; then
  KIND='run'
elif [[ -n "$SCHEDULE" ]]; then
  KIND='schedule'
else
  KIND='run'
fi

# The CLI prints "  ID:        <id>" for the run/schedule identifier.
PARSED_ID=$(printf '%s' "$OUTPUT" | grep -E '^\s*ID:' | head -1 | sed -E 's/^\s*ID:\s*//') || true
SAFE_OUTPUT=$(json_escape "$OUTPUT")

if [[ "$KIND" == 'schedule' ]]; then
  # "  Cron:    <expr>" — fall back to the schedule we sent if the label is absent.
  CRON_EXPR=$(printf '%s' "$OUTPUT" | grep -E '^\s*Cron:' | head -1 | sed -E 's/^\s*Cron:\s*//') || true
  [[ -z "$CRON_EXPR" ]] && CRON_EXPR="$SCHEDULE"
  SAFE_ID=$(json_escape "$PARSED_ID")
  SAFE_CRON=$(json_escape "$CRON_EXPR")
  printf '{"status":"success","kind":"schedule","scheduleId":"%s","cronExpr":"%s","cliOutput":"%s"}\n' \
    "$SAFE_ID" "$SAFE_CRON" "$SAFE_OUTPUT"
else
  # "  PR:        <url>"
  PR_URL=$(printf '%s' "$OUTPUT" | grep -E '^\s*PR:' | head -1 | sed -E 's/^\s*PR:\s*//') || true
  SAFE_ID=$(json_escape "$PARSED_ID")
  SAFE_PR=$(json_escape "$PR_URL")
  printf '{"status":"success","kind":"run","runId":"%s","prUrl":"%s","cliOutput":"%s"}\n' \
    "$SAFE_ID" "$SAFE_PR" "$SAFE_OUTPUT"
fi
