# Add a one-line visible note to README.md for PR #983 (case plan b)

## Plan Summary

- **What/why:** Add exactly one new, human-visible line of text near the top of
  `README.md` that references "PR #983, case plan b". This is a disposable
  end-to-end test of the planning-and-launch pipeline; there is no functional
  code change.
- **Key decision:** The note is **visible** (a normal line of Markdown text that
  anyone reading the rendered page can see), placed directly under the H1 title
  — per the authoritative Understanding. It is **not** a hidden `<!-- -->`
  marker.
- **Most important file:** `README.md` (the single file touched). No executable
  code, tests, or config change.
- **Out of scope:** Do **not** create `.hublaunch/goals.md`. No other file
  edits, no commits, no PR actions beyond the normal launch flow.
- **Priority/complexity:** Trivial (one-line documentation edit). Low risk.

## Problem Statement

This is a disposable end-to-end test request used to exercise the HubLaunch
planning-and-launch pipeline. The request asks for a single one-line note (a
"comment", used loosely to mean a short remark) to be added to the project's
only documentation file, `README.md`, tagged as belonging to "PR #983, case plan
b". There is no behavioural or API change — `scripts/contact.ts` and all other
logic are untouched.

#### Planning Context

**Key requirements**

- Add exactly **one** new line of text to `README.md`.
- The line must reference the marker "PR #983, case plan b" so the test marker
  is identifiable.
- The line must be **visible** in the rendered Markdown (not a hidden HTML
  comment).
- Place the line at the **top** of the README (directly under the H1 title).
- No existing README content may be altered or deleted.

**Decisions made (with rationale)**

- **Visible, not hidden.** The clarifying round's recorded Understanding is
  authoritative: "add one visible line at the top of README.md". Although the
  raw letter answer to the visibility question was ambiguous, the normalized
  answer and the final Understanding both specify a **visible** one-line note at
  the top of the README, so the plan uses a plain visible Markdown line.
- **Placement under the H1 title.** "Top of the README" is implemented as the
  first content line after the H1 title (`README.md:1`), separated by a blank
  line, so it reads as an intro note without breaking the existing title →
  intro-paragraph structure (`README.md:1`–`README.md:8`).
- **Plain-prose style.** The README uses standard GitHub-flavored Markdown with
  an H1 title and plain prose (`README.md:1`, `README.md:3`). The new line
  matches that plain-prose style — no new heading, list, or code block.
- **Do not save goals.** The user answered "No" to persisting inferred goals, so
  `.hublaunch/goals.md` is **not** created.

**Out of scope**

- Creating or modifying `.hublaunch/goals.md`.
- Any change to `scripts/contact.ts`, tests, `package.json`, or configuration.
- Multi-line notes, new sections, or hidden `<!-- -->` markers.
- Committing, branching, or opening a PR as part of this plan (handled by the
  launch flow, not by edits here).

## Detailed Requirements

**Functional**

- `README.md` contains one newly added visible line of prose that references
  "PR #983" and "case plan b".
- The line is placed directly under the H1 title (`# Contact Us → Slack`).
- All pre-existing README content is preserved verbatim.

**Technical**

- The change is Markdown-only; it introduces no runtime npm dependencies and
  touches no `.ts` file.
- The repository's TypeScript build/verification (`npm run typecheck`, i.e.
  `tsc --noEmit`) remains passing because no code is affected.

**Non-Functional**

- Minimal diff: exactly one file changed, one line added, zero deletions.
- Style matches the existing plain-prose GitHub-flavored Markdown.

## Proposed Solution

Insert a single visible Markdown line immediately after the H1 title line in
`README.md`, separated from both the title above and the intro paragraph below
by blank lines. No other content changes. Because the change is confined to one
file and does not span components, no architecture diagram is needed.

Concretely, after the edit the top of the file reads:

```markdown
# Contact Us → Slack

> Note: one-line comment added for PR #983, case plan b.

A headless "Contact Us" feature (for testing). Given a submission with four
```

The Markdown blockquote (`>`) form is used so the note reads clearly as an
editorial note while remaining a single visible line; a plain paragraph line
would be equally acceptable. The exact wording is not important for this
disposable test as long as it is a single short visible line referencing "PR
#983" and "case plan b".

<details><summary><b>Implementation Detail</b></summary>

### Edge Cases

- **Blank-line separation.** Ensure there is exactly one blank line between the
  H1 title and the new note, and one blank line between the new note and the
  existing intro paragraph, so the Markdown renders the title, note, and
  paragraph as three distinct blocks.
- **Single line only.** The addition must be one line — no wrapping onto a
  second physical line and no multi-line block.
- **No edits to existing lines.** Do not reflow or reword the existing title or
  intro paragraph.

### Implementation Steps

**Phase 1 — Edit the README (file: `README.md`)**

1. Open `README.md`.
2. After the H1 title on `README.md:1` (`# Contact Us → Slack`) and its
   following blank line (`README.md:2`), insert a single visible line, e.g.:
   `> Note: one-line comment added for PR #983, case plan b.`
3. Insert a blank line after the new note so the existing intro paragraph
   (currently starting at `README.md:3`) remains its own block.
4. Save. Do not touch any other line in the file.

**Phase 2 — Verify (no file changes)**

1. Confirm the diff shows exactly one file changed (`README.md`) with one
   addition and no deletions.
2. Confirm the note references "983" and "plan b".
3. Run `npm install` then `npm run typecheck` and confirm it exits `0`.

### Technical Considerations

- **Dependencies:** None added. Runtime npm dependencies remain zero, per the
  repo convention.
- **Config:** No configuration change. `.hublaunch/goals.md` is intentionally
  not created.
- **Security:** No secrets involved. `SLACK_URL` and `.env` are untouched; the
  note contains no sensitive data.

### Testing Strategy

- **Unit:** None applicable (documentation-only change).
- **Integration:** None applicable.
- **Manual / CLI checklist** (derived from the End-to-End Test Cases below):
  - `grep -n "983" README.md` returns the single new note line.
  - `git diff --stat` shows `README.md` as the only changed file; `git diff
    README.md` shows one `+` line and no `-` lines to existing content.
  - `npm install && npm run typecheck` exits `0`.

### Documentation Updates

- The change **is** the documentation update (`README.md`). No other docs change.
- Do not update `ralph.md` or any other file.

### Acceptance Criteria

- **AC1:** `README.md` contains the newly added visible one-line note
  referencing "PR #983" and "case plan b", placed at the top (under the H1
  title).
- **AC2:** The change is limited to a single added line in `README.md` with no
  deletions to existing content and no other file modified.
- **AC3:** `npm run typecheck` still exits `0` after the edit (no regression to
  the project's verification).

### Assumptions

- **Visible, not hidden.** Per the authoritative Understanding ("add one visible
  line at the top of README.md"), the note is a plain visible Markdown line. The
  raw letter answer to the visibility question was ambiguous, but both the
  normalized answer and the Understanding specify visible; visible is therefore
  used.
- **"Top" = directly under the H1 title.** Implemented as the first content line
  after `README.md:1`, separated by blank lines.
- **"Comment" means a note/remark**, i.e. one short line of visible text — not a
  hidden Markdown/HTML comment and not a multi-line block.
- **Exact wording is flexible** because the project is an explicit disposable
  test fixture; the line need only be a single short visible line referencing
  "PR #983" and "case plan b".
- **Do not create `.hublaunch/goals.md`** (user answered "No").
- **No commit/branch/PR actions** are part of this plan beyond the standard
  launch flow; only `README.md` is edited.
- **No drift:** the current checkout commit matches the Repo Snapshot commit
  `5dd7a6423a0fff037432818912c7744a58c21fb1`, so the Understanding applies
  directly.

### Dependencies & Related Work

- None. This is a self-contained one-line documentation edit with no upstream or
  downstream dependencies.

</details>

## End-to-End Test Cases

```json
{
  "version": 1,
  "cases": [
    {
      "index": 1,
      "item": "README contains a newly added one-line note referencing PR #983 case plan b",
      "driver": "cli",
      "expected": "Searching README.md finds exactly one new line that references '983' (and/or 'plan b'); the rest of the file is unchanged.",
      "needsRealClaude": false,
      "criterion": "AC1",
      "setup": "Run from the repo root after the change is applied, e.g. grep for '983' in README.md.",
      "struck": false
    },
    {
      "index": 2,
      "item": "The change adds only a single line and touches no other file",
      "driver": "cli",
      "expected": "git diff shows one file changed (README.md) with a one-line addition and no deletions to existing content.",
      "needsRealClaude": false,
      "criterion": "AC2",
      "setup": "Inspect `git diff --stat` and `git diff README.md` after the change.",
      "struck": false
    },
    {
      "index": 3,
      "item": "Type-check still passes after the documentation edit",
      "driver": "cli",
      "expected": "`npm run typecheck` exits 0, confirming the README-only change did not affect the code.",
      "needsRealClaude": false,
      "criterion": "AC3",
      "setup": "Run `npm install` then `npm run typecheck` from the repo root.",
      "struck": false
    }
  ]
}
```
