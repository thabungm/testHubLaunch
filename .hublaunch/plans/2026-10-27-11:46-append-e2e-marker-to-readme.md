# Append the HubLaunch E2E marker comment to `README.md`

## Plan Summary

- **What / why:** Append exactly one new line — the literal HTML comment `<!-- hula-e2e e2e-c0df014-android -->` — to the end of `README.md`. This is a disposable HubLaunch end-to-end test (hula-server PR #831, run `e2e-c0df014-1634`, tracking name `e2e-c0df014-android`) that exercises the plan → PR pipeline; the resulting branch/PR is to be **closed unmerged**.
- **Key decision:** Proceed exactly as requested (user answer Q1 = "A) As requested"). The marker is machine-generated provenance and is placed **verbatim**, not reworded or "improved."
- **Most important file:** `README.md` — the only file touched. The line is appended after the current final line (`README.md:85`), preceded by one blank line for readability.
- **Priority / complexity:** Trivial, docs-only, one-line append. No source, config, or test changes. No build/typecheck/lint/test impact (the comment renders invisibly in Markdown).
- **Scope guard:** "Nothing else" is a hard constraint — no other file (source, config, `.hublaunch/*`, tests) is created or modified.

## Problem Statement

The HubLaunch E2E harness needs to verify the end-to-end planning → implementation → PR flow against this disposable target repository. The verification signal is a single, unambiguous provenance marker written into `README.md`. Appending the literal HTML comment `<!-- hula-e2e e2e-c0df014-android -->` to the file is the entire deliverable; the resulting PR is expected to be reviewed and closed without merging.

`README.md` currently has 85 lines, ending with the `## Notes` section (last line `README.md:85`). A `grep -n "hula-e2e" README.md` returns no match (exit 1), so there is no existing marker to deduplicate against — this is a clean append.

#### Planning Context

- **Key requirement:** Add exactly one new line — the literal string `<!-- hula-e2e e2e-c0df014-android -->` — at the end of `README.md`. Make no other change.
- **Decision (Q1 = A):** Proceed as requested. Although the disposable marker serves the HubLaunch tooling rather than the Contact→Slack harness's end users, the user explicitly chose to proceed as-is.
- **Decision — verbatim placement:** The marker is machine-generated provenance; it is placed exactly as given, with no rewording, no surrounding prose, and no change to its content.
- **Decision — formatting:** The comment is placed on its own line, preceded by a single blank line, consistent with the spacing between existing sections in the file.
- **Out of scope:**
  - Any change to `scripts/contact.ts`, `package.json`, or any other source/config file.
  - Creating `.hublaunch/goals.md`, `.hublaunch/hublaunch.config.js`, or any other `.hublaunch/*` file. (Although Q2 was answered "Yes" to saving inferred project goals, that is a planning-tooling concern outside this disposable one-line implementation PR, whose request is explicitly "Nothing else." It is noted under Assumptions and intentionally not part of the implementation.)
  - Any build, typecheck, lint, or test modification.
  - Merging the PR — it is to be closed unmerged.

## Detailed Requirements

**Functional**
- `README.md` must contain the exact line `<!-- hula-e2e e2e-c0df014-android -->` as its final content line after the change.
- The marker string must be reproduced character-for-character, including the `hula-e2e ` prefix and the `e2e-c0df014-android` tracking name.

**Technical**
- Edit only `README.md`. No other file in the repository is created, modified, or deleted.
- Append after the existing final line (`README.md:85`), separated by one blank line.
- Preserve all existing content of `README.md` unchanged.

**Non-Functional**
- The change must be invisible when the Markdown is rendered (HTML comments do not render).
- No impact on build, typecheck, lint, or test outcomes.

## Proposed Solution

Append two lines to the end of `README.md`: one blank line (separating the marker from the final `## Notes` bullet) followed by the literal comment line. This mirrors the existing blank-line-between-blocks spacing used throughout the file. No other component is involved, so no diagram is needed.

Resulting tail of `README.md`:

```
- Node < 22.6 cannot run `.ts` directly — use the `npm run` scripts (which use
  `tsx`) or `npx tsx scripts/...`.

<!-- hula-e2e e2e-c0df014-android -->
```

## Implementation Steps

### Phase 1 — Append the marker
1. Open `README.md`.
2. After the current final line (`README.md:85`, the `tsx`/`npx tsx scripts/...` bullet continuation), add one blank line, then add the line `<!-- hula-e2e e2e-c0df014-android -->`.
3. Ensure the file ends with a single trailing newline after the marker line (POSIX-friendly, matching typical editor behavior).
4. Make no other edit to the file.

### Phase 2 — Verify
1. Run `grep -n "hula-e2e e2e-c0df014-android" README.md` — expect exactly one match on the final content line.
2. Run `git diff --stat` — expect exactly one file changed (`README.md`) with a small positive insertion count and zero deletions.
3. Confirm no other files appear in `git status`.

<details><summary><b>Implementation Detail</b></summary>

### Edge Cases
- **Duplicate marker:** Confirmed absent (`grep` exit 1). If a prior run already added it, do not add a second copy — the file should contain the marker exactly once.
- **Trailing newline:** The current file's final line ends the `## Notes` section. Appending a blank line plus the marker, then a single trailing newline, keeps the diff minimal and avoids a "no newline at end of file" artifact.
- **Exact string:** Do not substitute smart quotes, collapse the single spaces inside the comment, or alter the tracking name. The string is `<!-- hula-e2e e2e-c0df014-android -->`.

### Error Handling & Resilience
- Not applicable — this is a static documentation edit with no runtime behavior.

### Performance
- Not applicable.

### Security
- No secrets, no network, no executable code. The marker is an inert Markdown comment. `.env` and the Slack webhook URL are untouched.

### Testing Strategy
- **Unit / integration / automated:** None required or expected to change; the edit is an invisible Markdown comment with no code path.
- **Manual verification:**
  - `grep -n "hula-e2e e2e-c0df014-android" README.md` returns a single match.
  - `git diff README.md` shows only the added blank line and marker line, no other hunks.
  - Optionally render `README.md` (e.g., GitHub preview) and confirm the comment is invisible and the rest of the document is unchanged.

### Documentation Updates
- The change *is* the documentation edit. No other docs (no `CHANGELOG`, no `.hublaunch/goals.md`) are updated as part of this disposable test.

### Dependencies & Related Work
- No package, tooling, or configuration dependencies.
- Related context: recent `main` commits (`5dd7a64 test: beforeLaunch hook fixture...`, `5297643 Add feedback-outcome-test skill...`) are themselves HubLaunch E2E fixtures, confirming this repository is routinely used as a disposable E2E target and that trivial doc-only appends are an established pattern here.

</details>

## Acceptance Criteria

- [ ] `README.md` contains the exact line `<!-- hula-e2e e2e-c0df014-android -->` as its final content line.
- [ ] `grep -n "hula-e2e e2e-c0df014-android" README.md` returns exactly one match.
- [ ] `git diff --stat` shows exactly one file changed — `README.md` — with zero deletions and only the marker (and its preceding blank line) added.
- [ ] No other file (source, config, `.hublaunch/*`, tests) is created, modified, or deleted.
- [ ] The marker string is byte-for-byte identical to `<!-- hula-e2e e2e-c0df014-android -->` (no rewording, no whitespace changes).

## Assumptions

- The line is appended to the **end** of `README.md`, preceded by one blank line, on its own line, exactly as `<!-- hula-e2e e2e-c0df014-android -->` with no surrounding text.
- No build, typecheck, lint, or test run is required or expected to change.
- The branch/PR produced is intended to be **closed unmerged** per the request, so long-term `README.md` cleanliness on `main` is not a concern.
- Q2 ("save inferred project goals as `.hublaunch/goals.md`") was answered "Yes," but creating that file is a planning-tooling concern and conflicts with the request's explicit "Nothing else" constraint for this disposable one-line implementation PR; it is therefore intentionally excluded from this plan's scope. If goals-file creation is desired, it should be a separate, non-disposable change.
- The current checkout (commit `5dd7a6423a0fff037432818912c7744a58c21fb1`) matches the Repo Snapshot — no drift; `README.md` is 85 lines and the marker is absent.
