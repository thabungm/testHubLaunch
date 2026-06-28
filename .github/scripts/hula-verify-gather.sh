#!/usr/bin/env bash
# hula-verify-gather.sh — Steps 2-5 of the hula.verify workflow
# Usage: bash .github/scripts/hula-verify-gather.sh <issue-number>
#
# Fetches issue details, finds associated PR, gathers PR files and diff.
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

while [[ $# -gt 0 ]]; do
  case "$1" in
    [0-9]*)
      ISSUE_NUMBER="$1"; shift ;;
    *)
      die 1 "Unknown argument: $1" ;;
  esac
done

if [[ -z "$ISSUE_NUMBER" ]]; then
  die 1 "Usage: bash .github/scripts/hula-verify-gather.sh <issue-number>"
fi

# Strict numeric validation. The case glob [0-9]* only checks the FIRST char,
# so a value like '1") | env' would pass and be interpolated into a jq program
# string and into raw JSON output. Require a pure integer to prevent injection.
if [[ ! "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
  die 1 "Invalid issue number (must be a positive integer): ${ISSUE_NUMBER}"
fi

# ── Step 2: Fetch issue details ────────────────────────────────────────────────

printf '🔍 Fetching issue #%s...\n' "$ISSUE_NUMBER" >&2

ISSUE_JSON=$(gh issue view "$ISSUE_NUMBER" --json title,body,number,url,state 2>/dev/null) \
  || die 1 "Issue #${ISSUE_NUMBER} not found or not accessible."

ISSUE_TITLE=$(printf '%s' "$ISSUE_JSON" | grep -o '"title":"[^"]*"' | head -1 | sed 's/"title":"//;s/"$//')
ISSUE_STATE=$(printf '%s' "$ISSUE_JSON" | grep -o '"state":"[^"]*"' | head -1 | sed 's/"state":"//;s/"$//')
ISSUE_URL=$(printf '%s' "$ISSUE_JSON" | grep -o '"url":"[^"]*"' | head -1 | sed 's/"url":"//;s/"$//')

# ── Step 3: Find associated PR ────────────────────────────────────────────────

printf '🔗 Looking for PR linked to issue #%s...\n' "$ISSUE_NUMBER" >&2

# Try linked search first (works when PR is formally linked via GitHub)
PR_NUMBER=$(gh pr list --search "linked:${ISSUE_NUMBER}" --json number -q '.[0].number' 2>/dev/null) || true

if [[ -z "$PR_NUMBER" ]]; then
  # Fallback: search PR bodies for issue references
  # Handles both short format (#N) and full-path format (owner/repo#N)
  # Uses gh's built-in jq (-q) — no external jq required
  JQ_EXPR='.[] | select(.body != null) | select(.body | test("(Fixes|Closes|Resolves)[ ]+([A-Za-z0-9._-]+/[A-Za-z0-9._-]+)?#'"${ISSUE_NUMBER}"'([^0-9]|$)|(^|[^0-9])#'"${ISSUE_NUMBER}"'([^0-9]|$)"; "i")) | .number'
  PR_NUMBER=$(gh pr list --json number,body --limit 100 -q "$JQ_EXPR" 2>/dev/null | head -1) || true
fi

if [[ -z "$PR_NUMBER" ]]; then
  die 1 "No PR found for issue #${ISSUE_NUMBER}. The implementation may not have started yet."
fi

# Fetch full PR details via pr view (reliable single-object JSON)
PR_DETAILS=$(gh pr view "$PR_NUMBER" --json number,title,url,state,headRefName,isDraft 2>/dev/null) \
  || die 2 "Failed to fetch details for PR #${PR_NUMBER}."

PR_TITLE=$(printf '%s' "$PR_DETAILS" | grep -o '"title":"[^"]*"' | head -1 | sed 's/"title":"//;s/"$//')
PR_URL=$(printf '%s' "$PR_DETAILS" | grep -o '"url":"[^"]*"' | head -1 | sed 's/"url":"//;s/"$//')
PR_STATE=$(printf '%s' "$PR_DETAILS" | grep -o '"state":"[^"]*"' | head -1 | sed 's/"state":"//;s/"$//')
PR_BRANCH=$(printf '%s' "$PR_DETAILS" | grep -o '"headRefName":"[^"]*"' | head -1 | sed 's/"headRefName":"//;s/"$//')
PR_DRAFT=$(printf '%s' "$PR_DETAILS" | grep -o '"isDraft":[a-z]*' | head -1 | sed 's/"isDraft"://')

# ── Step 4: Fetch PR file changes ─────────────────────────────────────────────

printf '📊 Fetching changed files for PR #%s...\n' "$PR_NUMBER" >&2

PR_FILES_JSON=$(gh pr view "$PR_NUMBER" --json files,additions,deletions 2>/dev/null) \
  || die 2 "Failed to fetch PR files for PR #${PR_NUMBER}."

TOTAL_ADDITIONS=$(printf '%s' "$PR_FILES_JSON" | grep -o '"additions":[0-9]*' | tail -1 | sed 's/"additions"://')
TOTAL_DELETIONS=$(printf '%s' "$PR_FILES_JSON" | grep -o '"deletions":[0-9]*' | tail -1 | sed 's/"deletions"://')

# Count files by category (rough heuristic)
FILES_LIST=$(printf '%s' "$PR_FILES_JSON" | grep -o '"path":"[^"]*"' | sed 's/"path":"//;s/"$//')

CODE_COUNT=0
TEST_COUNT=0
DOC_COUNT=0
CONFIG_COUNT=0
TOTAL_COUNT=0

while IFS= read -r fpath; do
  [[ -z "$fpath" ]] && continue
  TOTAL_COUNT=$((TOTAL_COUNT + 1))
  case "$fpath" in
    *.test.*|*.spec.*|*/__tests__/*|*/test/*|*/tests/*) TEST_COUNT=$((TEST_COUNT + 1)) ;;
    *.md|docs/*|README*|CHANGELOG*|DOCUMENTATION*) DOC_COUNT=$((DOC_COUNT + 1)) ;;
    package.json|package-lock.json|tsconfig*|*.config.*|*.json|*.yaml|*.yml) CONFIG_COUNT=$((CONFIG_COUNT + 1)) ;;
    *) CODE_COUNT=$((CODE_COUNT + 1)) ;;
  esac
done <<< "$FILES_LIST"

# ── Step 5: Fetch PR diff ─────────────────────────────────────────────────────

printf '📄 Fetching PR diff...\n' >&2

# Use mktemp to avoid predictable temp paths (symlink/overwrite attacks in a
# shared /tmp). The PR number is embedded only in the template suffix.
DIFF_FILE=$(mktemp "${TMPDIR:-/tmp}/hula-verify-diff-${PR_NUMBER}-XXXXXX.patch") \
  || die 2 "Failed to create temporary diff file."
gh pr diff "$PR_NUMBER" > "$DIFF_FILE" 2>/dev/null \
  || printf '⚠️  Could not fetch PR diff (PR may be too large or not accessible)\n' >&2

# ── Output result ─────────────────────────────────────────────────────────────

SAFE_ISSUE_TITLE=$(json_escape "$ISSUE_TITLE")
SAFE_PR_TITLE=$(json_escape "$PR_TITLE")
SAFE_PR_URL=$(json_escape "$PR_URL")
SAFE_ISSUE_URL=$(json_escape "$ISSUE_URL")
SAFE_PR_BRANCH=$(json_escape "$PR_BRANCH")
SAFE_DIFF_FILE=$(json_escape "$DIFF_FILE")
PR_DRAFT_VAL="${PR_DRAFT:-false}"

printf '{"status":"success","issueNumber":%s,"issueTitle":"%s","issueState":"%s","issueUrl":"%s","prNumber":%s,"prTitle":"%s","prUrl":"%s","prState":"%s","prBranch":"%s","prIsDraft":%s,"diffFile":"%s","filesChanged":{"total":%d,"code":%d,"test":%d,"doc":%d,"config":%d},"lines":{"additions":%s,"deletions":%s}}\n' \
  "$ISSUE_NUMBER" "$SAFE_ISSUE_TITLE" "$ISSUE_STATE" "$SAFE_ISSUE_URL" \
  "$PR_NUMBER" "$SAFE_PR_TITLE" "$SAFE_PR_URL" "$PR_STATE" "$SAFE_PR_BRANCH" "$PR_DRAFT_VAL" \
  "$SAFE_DIFF_FILE" \
  "$TOTAL_COUNT" "$CODE_COUNT" "$TEST_COUNT" "$DOC_COUNT" "$CONFIG_COUNT" \
  "${TOTAL_ADDITIONS:-0}" "${TOTAL_DELETIONS:-0}"
