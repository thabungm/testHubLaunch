#!/usr/bin/env bash
# hula-session-hook.sh — Claude Code PreToolUse hook (matcher: Bash).
#
# Captures the Claude Code session id of the chat session that runs
# /hula-launch, so the hula CLI can send it to hula-server as
# `clientSessionId` (launch-session provenance; hula-server PR #419).
#
# Why a hook: bash subprocesses cannot learn the session id any other way —
# CLAUDE_SESSION_ID is not exported to the Bash tool, and the model does not
# know its own id. Hooks are the one place Claude Code provides it.
#
# Installed to .github/scripts/ and registered under hooks.PreToolUse in the
# consumer repo's .claude/settings.json by `hula init`. Costs nothing: it is
# a local shell script (no tokens, no API calls) that no-ops in ~5ms for any
# Bash call that is not a hula-launch-run.sh invocation.
#
# Input (stdin): hook JSON with .session_id, .cwd and .tool_input.command
# Output: $HOME/.hublaunch-sessions/<repo-dir-name>/<branch>.json
# Always exits 0 — a capture failure must never block the tool call.

INPUT="$(cat)"

CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)"
case "$CMD" in
  *hula-launch-run.sh*) ;;   # our target — continue
  *) exit 0 ;;               # any other Bash call — ignore
esac

SESSION_ID="$(printf '%s' "$INPUT" | jq -r '.session_id // empty' 2>/dev/null)"
CWD="$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)"
[ -z "$SESSION_ID" ] && exit 0

# --- extract the branch from the launch command ------------------------------
# Forms (see hula-launch-run.sh usage):
#   bash .github/scripts/hula-launch-run.sh <plan-path> <branch> [--handoff u] [--test] [--kill-and-relaunch]
#   bash .github/scripts/hula-launch-run.sh <branch> --kill        (no new task -> skip)
AFTER="${CMD#*hula-launch-run.sh}"
# shellcheck disable=SC2086
set -- $AFTER

POSITIONAL=()
KILL_ONLY=false
while [ $# -gt 0 ]; do
  case "$1" in
    --handoff) shift 2 || break ;;
    --kill) KILL_ONLY=true; shift ;;
    --test|--kill-and-relaunch) shift ;;
    --*) shift ;;
    *) POSITIONAL+=("$1"); shift ;;
  esac
done

$KILL_ONLY && exit 0                       # pure kill: no new task launched
[ "${#POSITIONAL[@]}" -lt 2 ] && exit 0    # need <plan-path> <branch>
BRANCH="${POSITIONAL[1]}"
# Keep only filename-safe chars; fold any path separator into '-'.
BRANCH="$(printf '%s' "$BRANCH" | tr -cd 'A-Za-z0-9._/-' | tr '/' '-')"
[ -z "$BRANCH" ] && exit 0

REPO_NAME="$(basename "${CWD:-$PWD}")"
OUT_DIR="$HOME/.hublaunch-sessions/$REPO_NAME"
mkdir -p "$OUT_DIR"

jq -n --arg sid "$SESSION_ID" --arg branch "$BRANCH" --arg cwd "$CWD" \
  '{sessionId:$sid, branch:$branch, cwd:$cwd, recordedAt:(now|todate)}' \
  > "$OUT_DIR/$BRANCH.json" 2>/dev/null

exit 0
