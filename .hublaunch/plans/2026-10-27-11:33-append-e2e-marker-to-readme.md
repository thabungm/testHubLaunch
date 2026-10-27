# Append the disposable E2E marker line to `README.md`

## Plan Summary

- **What / why:** Append exactly one line — the HTML comment `<!-- hula-e2e e2e-c0df014-hook -->` — to the end of `README.md`. This is an explicitly disposable end-to-end test for hula-server PR #831 (run `e2e-c0df014-1634`, tracking name `e2e-c0df014-hook`); the resulting branch/PR is to be closed unmerged.
- **Key decision:** "Nothing else" is taken literally — no other files, no formatting cleanup, no source/config/test changes. The marker is the single new line.
- **Most important file:** `README.md` (the only file to be modified).
- **Priority / complexity:** Trivial (one-line append); low risk — HTML comments render invisibly and the only source module, `scripts/contact.ts`, is untouched.
- **Note:** The user chose "proceed as requested" despite this adding no lasting value, and asked that inferred goals be saved — see the Planning Context for how that is handled given the single-file constraint.

## Problem Statement

A disposable end-to-end test harness (hula-server) needs to verify that the full plan → implement → PR pipeline works against this repository. The verification artifact is a single, visually-invisible marker line appended to the project README. No functional behavior of the project changes; the marker exists only so the harness can confirm the pipeline produced the expected edit.

`README.md` (85 lines at the current checkout) documents the Contact Us → Slack harness. It currently contains no HTML comments, so this marker will be the first. Appending to `README.md` follows the only documentation convention present — there is no `docs/` directory and no `CONTRIBUTING.md`.

#### Planning Context

**Key requirements**
- Append the exact string `<!-- hula-e2e e2e-c0df014-hook -->` verbatim as the final line of `README.md`, with a trailing newline.
- Make **no other repository changes** of any kind.

**Decisions made (with rationale)**
- **Append at end of file, not in a dedicated section.** The request says "append"; a trailing HTML comment is invisible in rendered Markdown and matches standard comment syntax, so it adds no visible noise. (Q1 answer: "As requested.")
- **Literal "nothing else."** No formatting cleanup, no reflow, no edits to `scripts/contact.ts`, `package.json`, config, or tests. This keeps the diff to a single added line and avoids perturbing the project during a disposable test.
- **Verbatim marker text.** The marker is a correlation token the harness greps for; any deviation (extra spaces, altered casing, surrounding heading) would break detection.
- **Goals file (Q2 answer: "Yes") is deferred, not done here.** The user approved saving inferred project goals to `.hublaunch/goals.md`. However, this request is scoped to "append one line to README.md, nothing else, close unmerged," and this planning pass is constrained to a single file edit. Creating `.hublaunch/goals.md` would contradict the "nothing else" constraint and pollute a disposable branch that will be closed unmerged. It is therefore recorded as a follow-up (see Out of scope) rather than implemented in this plan.

**Out of scope**
- Creating `.hublaunch/goals.md` (should be done in a separate, non-disposable change if still desired).
- Any change to `scripts/contact.ts`, the `SLACK_URL` secret path, `package.json`, or tests.
- Merging the PR — the pipeline closes it unmerged.
- Any documentation restructuring or Markdown cleanup.

## Detailed Requirements

**Functional**
- After the change, the last line of `README.md` is exactly `<!-- hula-e2e e2e-c0df014-hook -->` followed by a single newline.
- No line of `README.md` other than the appended one is added, removed, or modified.
- No file other than `README.md` is created, modified, or deleted.

**Technical**
- The marker string is byte-for-byte `<!-- hula-e2e e2e-c0df014-hook -->` (note the single spaces inside the comment delimiters and around the token).
- The existing file already ends with a newline, so the new content is appended as a new final line (do not collapse onto the current last line).

**Non-Functional**
- Zero functional impact: HTML comments are inert in Markdown rendering.
- Minimal, reviewable diff: exactly one added line.

## Proposed Solution

Make a one-line append to `README.md`. Because the file already terminates with a newline, insert the marker as a brand-new final line. No supporting components, no diagram needed — the change is confined to a single file.

## Technical Considerations

- **Dependencies / config:** None. No packages, scripts, or configuration are involved.
- **Security:** None affected. The change does not touch `scripts/contact.ts` or the `SLACK_URL` webhook path; `.env` handling is unchanged.
- **Encoding:** Keep the file UTF-8 / LF line endings consistent with the rest of `README.md`.

## Testing Strategy

- **Unit / integration:** Not applicable — documentation-only, no code paths exercised.
- **Manual verification:**
  - `git diff` shows exactly one added line and zero removed lines, only in `README.md`.
  - `tail -n 1 README.md` prints `<!-- hula-e2e e2e-c0df014-hook -->`.
  - `grep -c 'hula-e2e e2e-c0df014-hook' README.md` returns `1`.
  - `git status --porcelain` lists only `README.md` as modified.

## Documentation Updates

None beyond the marker line itself. The marker is invisible in rendered Markdown and carries no user-facing documentation meaning.

## Acceptance Criteria

- [ ] `README.md` ends with the line `<!-- hula-e2e e2e-c0df014-hook -->` followed by a single trailing newline.
- [ ] The marker string matches verbatim (no extra whitespace, casing, or decoration).
- [ ] `git diff --stat` shows `README.md` with `1 insertion(+)` and `0 deletions(-)`.
- [ ] No file other than `README.md` is changed.
- [ ] `scripts/contact.ts`, `package.json`, config, and tests are untouched.

<details><summary><b>Implementation Detail</b></summary>

### Implementation Steps

**Phase 1 — Append the marker**
1. Open `README.md` at the repository root.
2. Append a new final line containing exactly `<!-- hula-e2e e2e-c0df014-hook -->`, preserving the existing trailing newline so the marker sits on its own line and the file still ends with a newline.
   - The current final line is the "Node < 22.6 ..." bullet (`README.md:85`). The marker goes immediately after it as the new last line.

**Phase 2 — Verify**
3. Run the manual verification commands from the Testing Strategy section and confirm each expectation.

### Edge Cases
- **File already ends without a newline:** Verified it does end with a newline at the current checkout, so no special handling is needed. If a future checkout differs, still ensure the marker lands on its own line.
- **Marker already present:** If `grep` finds the marker already exists (e.g., a re-run), do not append a duplicate — the acceptance criterion requires exactly one occurrence.

### Repo Drift Note
- The Understanding's `Repo Snapshot` references commit `5dd7a6423a0fff037432818912c7744a58c21fb1` with `README.md` at 86 lines. The current checkout is commit `d3608fd15de0b534ed3d6c6dcd08c8d47b4f4632` with `README.md` at 85 lines (file ends with a trailing newline). This is minor, cosmetic drift — "append after the final line" is unaffected by the exact line count. Append to whatever the current final line is.

### Rollback
- The branch/PR is disposable and will be closed unmerged by the pipeline. No rollback action is required; discarding the branch fully reverts the change.

### Dependencies & Related Work
- Independent, one-off change. No blocking or dependent work.
- Related follow-up (not part of this plan): persist inferred project goals to `.hublaunch/goals.md`, as approved by the user in Q2, in a separate non-disposable change.

</details>

## Assumptions

- The marker line is appended at the very end of `README.md` as the single new line, with a trailing newline.
- The exact string `<!-- hula-e2e e2e-c0df014-hook -->` is used verbatim, with no surrounding heading or extra decoration.
- "Nothing else" is literal: no formatting cleanup and no other file edits.
- "Close unmerged" is a downstream pipeline instruction, not an action performed by implementation.
- Saving `.hublaunch/goals.md` (Q2) is intentionally deferred to respect the "nothing else" / disposable-branch constraints of this request.
