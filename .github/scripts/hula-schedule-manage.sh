#!/usr/bin/env bash
# hula-schedule-manage.sh — management surface for the /hula-schedule skill
# Usage (exactly one action per call):
#   bash .github/scripts/hula-schedule-manage.sh --list
#   bash .github/scripts/hula-schedule-manage.sh --list-schedules
#   bash .github/scripts/hula-schedule-manage.sh --show <runId>
#   bash .github/scripts/hula-schedule-manage.sh --run-now <scheduleId>
#   bash .github/scripts/hula-schedule-manage.sh --cancel-schedule <scheduleId>
#   bash .github/scripts/hula-schedule-manage.sh --publish-skill <repo-relative-path>
#   bash .github/scripts/hula-schedule-manage.sh --delete-skill <repo-relative-path>
#
# Each invocation maps to the corresponding `hula schedule …` call, captures its
# output, and emits a single structured JSON object to stdout; all other output
# goes to stderr.
#
# JSON contract (stdout):
#   read verbs    : {"status":"success","kind":"list|list-schedules|show","cliOutput":"…"}
#   run-now       : {"status":"success","kind":"run-now","runId":"…","cliOutput":"…"}
#   cancel        : {"status":"success","kind":"cancel-schedule","scheduleId":"…","cliOutput":"…"}
#   publish-skill : {"status":"success","kind":"publish-skill","path":"…","cliOutput":"…"}
#   delete-skill  : {"status":"success","kind":"delete-skill","path":"…","cliOutput":"…"}
#   failure       : {"status":"error","code":<n>,"message":"…"}
#
# Exit codes: 0=success, 1=user error, 2=tool error
#
# Security: never prints secrets. Credentials are resolved inside the CLI from
# flags/config/env — they are NOT passed by this script. --publish-skill and
# --delete-skill reject path traversal and require a .hublaunch/skills/ path.

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

# Validate a skill path: must be repo-relative, under .hublaunch/skills/, no traversal.
validate_skill_path() {
  local p="$1"
  case "$p" in
    /*) die 1 "Skill path must be repo-relative, not absolute: ${p}" ;;
  esac
  if printf '%s' "$p" | grep -q '\.\.'; then
    die 1 "Invalid skill path (path traversal not allowed): ${p}"
  fi
  case "$p" in
    .hublaunch/skills/*) : ;;
    *) die 1 "Skill path must be under .hublaunch/skills/ — got ${p}" ;;
  esac
}

# ── argument parsing ────────────────────────────────────────────────────────────
# Exactly one action flag is allowed per call.

ACTION=''
ARG=''

set_action() {
  if [[ -n "$ACTION" ]]; then
    die 1 "Provide exactly one action (got --$ACTION and $1)."
  fi
  ACTION="$1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list)                   set_action 'list'; shift ;;
    --list-schedules)         set_action 'list-schedules'; shift ;;
    --show)                   set_action 'show'; ARG="$2"; shift 2 ;;
    --show=*)                 set_action 'show'; ARG="${1#--show=}"; shift ;;
    --run-now)                set_action 'run-now'; ARG="$2"; shift 2 ;;
    --run-now=*)              set_action 'run-now'; ARG="${1#--run-now=}"; shift ;;
    --cancel-schedule)        set_action 'cancel-schedule'; ARG="$2"; shift 2 ;;
    --cancel-schedule=*)      set_action 'cancel-schedule'; ARG="${1#--cancel-schedule=}"; shift ;;
    --publish-skill)          set_action 'publish-skill'; ARG="$2"; shift 2 ;;
    --publish-skill=*)        set_action 'publish-skill'; ARG="${1#--publish-skill=}"; shift ;;
    --delete-skill)           set_action 'delete-skill'; ARG="$2"; shift 2 ;;
    --delete-skill=*)         set_action 'delete-skill'; ARG="${1#--delete-skill=}"; shift ;;
    *)                        die 1 "Unexpected argument: $1" ;;
  esac
done

if [[ -z "$ACTION" ]]; then
  die 1 "Usage: bash .github/scripts/hula-schedule-manage.sh (--list | --list-schedules | --show <id> | --run-now <id> | --cancel-schedule <id> | --publish-skill <path> | --delete-skill <path>)"
fi

# Actions that require an argument.
case "$ACTION" in
  show|run-now|cancel-schedule|publish-skill|delete-skill)
    [[ -n "$ARG" ]] || die 1 "--$ACTION requires an argument." ;;
esac

# Path validation for skill file actions.
case "$ACTION" in
  publish-skill|delete-skill) validate_skill_path "$ARG" ;;
esac

# ── Build and run the hula schedule invocation ────────────────────────────────

CLI_ARGS=()
case "$ACTION" in
  list)            CLI_ARGS=(--list) ;;
  list-schedules)  CLI_ARGS=(--list-schedules) ;;
  show)            CLI_ARGS=(--show "$ARG") ;;
  run-now)         CLI_ARGS=(--run-now "$ARG") ;;
  cancel-schedule) CLI_ARGS=(--cancel-schedule "$ARG") ;;
  publish-skill)   CLI_ARGS=(--publish-skill "$ARG") ;;
  delete-skill)    CLI_ARGS=(--delete-skill "$ARG") ;;
esac

printf '⚙️  hula schedule --%s...\n' "$ACTION" >&2

OUTPUT=$(hula schedule "${CLI_ARGS[@]}" 2>&1) || die 2 "Management action failed: $OUTPUT"

SAFE_OUTPUT=$(json_escape "$OUTPUT")

# ── Emit the structured JSON result ──────────────────────────────────────────

case "$ACTION" in
  list|list-schedules|show)
    printf '{"status":"success","kind":"%s","cliOutput":"%s"}\n' \
      "$ACTION" "$SAFE_OUTPUT"
    ;;
  run-now)
    # The CLI prints "  ID:        <id>" for the new run.
    RUN_ID=$(printf '%s' "$OUTPUT" | grep -E '^\s*ID:' | head -1 | sed -E 's/^\s*ID:\s*//') || true
    SAFE_ID=$(json_escape "$RUN_ID")
    printf '{"status":"success","kind":"run-now","runId":"%s","cliOutput":"%s"}\n' \
      "$SAFE_ID" "$SAFE_OUTPUT"
    ;;
  cancel-schedule)
    SAFE_ID=$(json_escape "$ARG")
    printf '{"status":"success","kind":"cancel-schedule","scheduleId":"%s","cliOutput":"%s"}\n' \
      "$SAFE_ID" "$SAFE_OUTPUT"
    ;;
  publish-skill|delete-skill)
    SAFE_PATH=$(json_escape "$ARG")
    printf '{"status":"success","kind":"%s","path":"%s","cliOutput":"%s"}\n' \
      "$ACTION" "$SAFE_PATH" "$SAFE_OUTPUT"
    ;;
esac
