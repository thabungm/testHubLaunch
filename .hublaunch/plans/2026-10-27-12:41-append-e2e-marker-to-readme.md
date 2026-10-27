# Append the E2E marker comment `<!-- hula-e2e e2e-be27653-hook -->` to README.md

## Plan Summary

- **What / why:** Append exactly one line — the HTML comment `<!-- hula-e2e e2e-be27653-hook -->` — to the end of `README.md`. This is a disposable end-to-end test of the HubLaunch planning → PR → close pipeline (hula-server PR #831, run `e2e-be27653-1742`), not a product feature.
- **Key decision:** Proceed exactly as requested (Q1 → "As requested"). The marker is an opaque E2E token with no user-facing value; that is intentional and accepted for this throwaway validation.
- **Most important file:** `README.md` — the sole file modified. The line is appended as a new final line after the current last line (line 86), preserving a single trailing newline.
- **Priority / complexity:** Trivial (one-line docs append, no code paths touched). The only non-obvious constraint is strict literal exactness of the marker text and the "nothing else" scope.
- **Lifecycle:** The resulting PR is to be **closed unmerged** — it exists only to validate plan→PR→close mechanics and must not land on `main`.

## Problem Statement

The HubLaunch team needs to validate the full remote planning pipeline (plan generation → PR creation → PR closure) end-to-end without introducing any real product change. To do this, a disposable, no-op documentation edit is required: appending a single invisible HTML comment to `README.md`. Because the comment renders as nothing in markdown, there is zero visible or functional impact on the repository's "Contact Us → Slack" fixture, while still producing a real, closeable PR for the pipeline to exercise.

#### Planning Context

**Key requirements**
- Append the literal text `<!-- hula-e2e e2e-be27653-hook -->` as a new final line of `README.md`.
- Make **no other change**: no new files, no edits to code/config/tests, no changelog entry.
- Preserve the file's existing single trailing-newline convention.

**Decisions made (with rationale)**
- **Proceed as requested (Q1 = A).** The honest assessment scored "Project goals" 3/5 because the marker serves no project user. The requester explicitly chose to proceed as-is; this is a deliberate throwaway, so the low goal-alignment score is expected and accepted.
- **Save inferred project goals as `.hublaunch/goals.md` (Q2 = A).** The requester opted to persist the goals inferred during assessment. **Scope note:** This is a pipeline/operator follow-up, not part of the one-file README change this plan implements. Because the core request is "append one line to README.md — nothing else," the implementing agent should treat the goals-file creation as an optional, separately-tracked operator action and must not let it alter or expand the README-only diff. See *Out of scope* below.
- **Marker placement = end of file.** The request and assessment both fix the location at the very end, appended after the current last line.

**Out of scope**
- Any modification to `scripts/contact.ts`, `scripts/test-contact.ts`, `scripts/build.mjs`, or `package.json`.
- Running `npm run typecheck`, `npm run test:contact`, or `npm run build` — a markdown comment cannot affect them.
- Merging the PR. The PR is explicitly to be closed unmerged by the operator/pipeline.
- Creating `.hublaunch/goals.md` as part of the README diff (tracked separately per the scope note above).

## Detailed Requirements

**Functional**
- `README.md` gains exactly one additional line at its end: `<!-- hula-e2e e2e-be27653-hook -->`.
- The marker is an HTML comment and therefore invisible in rendered markdown — no visible documentation change.

**Technical**
- The appended line must be the exact literal string `<!-- hula-e2e e2e-be27653-hook -->` (no surrounding whitespace changes, no reflow of existing lines).
- The file must retain a single trailing newline after the new last line, matching its current ending (the file currently ends with `.\n` per the trailing-newline convention).
- The diff must consist of a single added line and no other hunks.

**Non-Functional**
- Zero functional impact on the "Contact Us → Slack" fixture; the exported API (`validateContact`, `buildSlackPayload`, `submitContactForm`) is untouched.
- The change follows the established throwaway-fixture pattern used by prior E2E commits (e.g. `test: beforeLaunch hook fixture for sandbox-side hook E2E (hula-server PR #759)`).

## Proposed Solution

Append the marker line to the end of `README.md`. The current final line is `README.md:86`:

```
  `tsx`) or `npx tsx scripts/...`.
```

After the change, the file ends with:

```
  `tsx`) or `npx tsx scripts/...`.
<!-- hula-e2e e2e-be27653-hook -->
```

No diagram is warranted — the change is a single-line append to one documentation file and spans no components.

<details><summary><b>Implementation Detail</b></summary>

### Implementation Steps

**Phase 1 — Apply the one-line append**
1. Open `README.md` and confirm the current last content line is line 86: `` `tsx`) or `npx tsx scripts/...`. `` with a trailing newline.
2. Append a new final line containing exactly `<!-- hula-e2e e2e-be27653-hook -->`.
3. Ensure a single trailing newline remains after the appended line (no double blank line, no missing newline).

**Phase 2 — Verify the diff is minimal**
4. Run `git diff README.md` and confirm the diff shows exactly one added line and no other changes.
5. Run `git status` and confirm `README.md` is the only modified tracked file (ignore the pre-existing untracked `.hublaunch/planning/` artifacts, which are pipeline state).

### Edge Cases
- **Trailing newline:** If the editor strips or doubles the trailing newline, correct it so the file ends with the marker line followed by exactly one `\n`.
- **Exact literal text:** Any deviation (extra spaces, different casing, missing `-->`) invalidates the E2E marker. Copy the string verbatim.
- **Accidental reflow:** Do not let an auto-formatter rewrap or reformat existing README lines; only the single append is permitted.

### Testing Strategy
- **Unit / Integration:** None required. A markdown HTML comment cannot affect `npm run typecheck`, `npm run test:contact`, or `npm run build`; running them is unnecessary and out of scope.
- **Manual:** Visually inspect `git diff` to confirm a single added line with the exact marker text and a preserved trailing newline. Optionally confirm the comment renders as nothing in a markdown preview.

### Documentation Updates
- The change *is* the documentation edit (an invisible comment). No other docs require updating. No README prose changes.

### Security Considerations
- None. An HTML comment contains no executable content and does not touch secrets, the `SLACK_URL` webhook flow, or `.env` handling.

### Dependencies & Related Work
- No code or package dependencies. Follows the disposable-fixture convention of prior E2E commits (`hula-server PR #759`, feedback-outcome-test skill). Associated with hula-server PR #831, run `e2e-be27653-1742`, tracking name `e2e-be27653-hook`, plan ID `cmvqnl7xl0007h2os6jv2gis3`.

</details>

## Acceptance Criteria

- [ ] `README.md` ends with the exact line `<!-- hula-e2e e2e-be27653-hook -->`.
- [ ] The file retains a single trailing newline after the appended line.
- [ ] `git diff README.md` shows exactly one added line and no other changes.
- [ ] No file other than `README.md` is created or modified as part of this change (pre-existing untracked `.hublaunch/planning/` pipeline artifacts excepted).
- [ ] No source, config, or test file is touched; the "Contact Us → Slack" feature behavior is unchanged.
- [ ] The resulting PR is closed unmerged (operator/pipeline action; not performed by the implementing change itself).

## Assumptions

- The line is appended at the very end of `README.md` with the exact literal text and no surrounding edits.
- A single trailing newline is preserved after the appended line, consistent with the file's current ending.
- "Nothing else" means no other file is created or modified — no changelog, no test, no config.
- Creating `.hublaunch/goals.md` (Q2 = Yes) is an operator/pipeline follow-up tracked separately and is intentionally excluded from the README-only diff this plan implements.
- "Close unmerged" is an instruction for the pipeline/human operator regarding the produced PR, not an action performed during implementation of the file change.
- The marker carries no semantic meaning for the project and is not referenced by any code or doc.
