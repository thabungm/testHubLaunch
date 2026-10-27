# Append a disposable `hula-e2e` marker comment to `README.md`

## Plan Summary

- **What / why:** Append exactly one inert HTML-comment line — `<!-- hula-e2e e2e-<SHA7>-android -->` — to the end of `README.md`. This is a disposable end-to-end exercise of the HubLaunch plan→PR→close pipeline (tracking name `e2e-be27653-android`, tied to hula-server PR #831), **not** a lasting feature.
- **Key decision:** Scope is taken literally ("Nothing else"): a single added line at end-of-file, no reflow or reformatting of any existing content. Confirmed "As requested" (Q1 → A).
- **Most important file:** `README.md` (sole code change; currently 85 lines, trailing newline present, no existing `hula-e2e` marker).
- **Secondary artifact:** Save the inferred project goals to `.hublaunch/goals.md` (Q2 → A), so future assessments can judge against stated goals.
- **Priority / complexity:** Low priority, trivial complexity. No build/test/lint touches `README.md`, so there is no regression risk. The resulting PR is to be **closed unmerged** by the server pipeline.

## Problem Statement

HubLaunch needs to validate the full planning pipeline — understanding → plan → PR → close — against a throwaway target repository. The chosen deliverable is intentionally minimal and reversible: a single invisible annotation in the project README. The marker is an HTML comment, so GitHub's rendered Markdown output is unchanged; the only effect is one extra line in the raw source.

The repository is routinely used as a disposable E2E target (see commits `5dd7a64` "beforeLaunch hook fixture for sandbox-side hook E2E" and `5297643` "feedback-outcome-test skill for e2e testing"), so adding and then discarding a marker fits established practice.

#### Planning Context

**Key requirements**
- Append **one** line of the form `<!-- hula-e2e e2e-<SHA7>-android -->` to `README.md`.
- `<SHA7>` is the 7-character run SHA. In the input, the request shows the raw, **unexpanded** placeholders `${process.env.SHA7}` / `${process.env.RUN_ID}`, and both env vars are unset in this sandbox. The concrete value is resolved by the server/launch step at PR time — it is **not** hard-coded in this plan. The implementing agent must substitute the actual 7-char SHA provided at launch; the literal string `<SHA7>` must not be committed.
- The line is appended at the very end of the file (after the current final line, `README.md:85`), preserving the existing trailing newline.

**Decisions made (with rationale)**
- **Proceed "As requested" (Q1 → A).** The honest assessment scored "Project goals" 3/5 because a disposable marker in a user-facing README serves no end user. The owner chose to proceed as-is because this is an intentionally disposable pipeline test whose PR will be closed unmerged, so the "noise" never lands.
- **Literal "Nothing else" scope.** Exactly one added line; no reflow, no reformatting, no trailing-whitespace or heading changes elsewhere. This keeps the diff a clean one-line addition and makes the close-unmerged step trivial to verify.
- **Append at EOF.** No other placement was specified, so end-of-file is chosen; it is the least intrusive location and keeps rendered output unchanged.
- **Save inferred goals (Q2 → A).** No `.hublaunch/goals.md` exists today; goals were inferred from `README.md`, `package.json`, and `ralph.md`. Persisting them lets future assessments evaluate requests against the owner's stated goals.

**Out of scope**
- Any change to files other than `README.md` and the new `.hublaunch/goals.md`.
- Tests, changelog entries, or docs-about-docs — none expected given the throwaway nature and explicit scope.
- Opening/merging/closing the PR and committing — those are server pipeline / PR-lifecycle actions, not part of the code change produced here. "Close unmerged" is handled by the pipeline.

## Detailed Requirements

**Functional**
- `README.md` gains exactly one new final line: `<!-- hula-e2e e2e-<SHA7>-android -->` with `<SHA7>` replaced by the launch-time 7-char SHA.
- No existing line of `README.md` is modified, reordered, or reflowed.
- The file continues to end with a single trailing newline.

**Technical**
- Edit target: end of `README.md` (after line 85 at commit `5dd7a6423a0fff037432818912c7744a58c21fb1`).
- The marker is a standard HTML comment, valid and invisible in GitHub-flavored Markdown.
- No dependency, config, or script changes.

**Non-Functional**
- Zero behavioral impact: no runtime, build, or render change.
- Fully reversible — the PR is expected to be closed unmerged.

## Proposed Solution

Make a single append-only edit to `README.md`. Because the change touches one file and no build/test tooling reads the README, no diagram or multi-component coordination is needed.

Concretely:
1. Confirm the file still ends at line 85 with a trailing newline and contains no `hula-e2e` marker (guards against drift from the snapshot commit).
2. Append the marker line, substituting the real 7-char SHA for `<SHA7>`.
3. Additionally create `.hublaunch/goals.md` with the inferred project goals (per Q2 → A).

## Implementation Steps

**Phase 1 — Pre-edit verification**
- Verify current checkout matches snapshot commit `5dd7a6423a0fff037432818912c7744a58c21fb1`. If it differs, re-confirm that `README.md` still ends cleanly and has no existing `hula-e2e` marker before proceeding (drift note: the plan was authored against this SHA).
- Confirm `grep -n "hula-e2e" README.md` returns nothing (first occurrence → pure append, not an update).

**Phase 2 — Apply the one-line edit**
- Open `/workspace/README.md`.
- Append a single new line after the current final line (`README.md:85`):
  ```
  <!-- hula-e2e e2e-<SHA7>-android -->
  ```
  Replace `<SHA7>` with the actual 7-character run SHA supplied at launch time (do not commit the literal `<SHA7>` or the unexpanded `${process.env.SHA7}` placeholder).
- Preserve the existing trailing newline; do not alter any other line.

**Phase 3 — Persist inferred goals (per Q2 → A)**
- Create `/workspace/.hublaunch/goals.md` capturing the goals inferred from `README.md`, `package.json`, and `ralph.md` (primarily: the "Contact Us → Slack" submission feature documented in the README, verified via `npm run typecheck` and `npm run test:contact`). Keep it concise; this file is for future assessment context, not a code change.

## Technical Considerations

<details><summary><b>Implementation Detail</b></summary>

### Edge Cases
- **Placeholder left unexpanded:** The greatest risk is committing the literal `<SHA7>` or `${process.env.SHA7}`. The implementing agent must substitute the concrete 7-char SHA from the launch environment. If no SHA is available at edit time, the marker cannot be finalized — surface that rather than committing a placeholder.
- **Drift from snapshot:** If the checkout no longer ends at line 85 or already contains a `hula-e2e` marker, stop and re-evaluate: a second append would create a duplicate marker. In that case, update/replace the existing marker instead of adding a new one.
- **Trailing newline:** Ensure exactly one newline terminates the file; avoid introducing a blank extra line or stripping the final newline.

### Dependencies & Config
- None. No `package.json` script (`contact`, `test:contact`, `typecheck`, `build`) reads `README.md`, and there is no README lint/format step.

### Security
- The marker is an inert comment containing a run SHA and the fixed string `android`. No secrets, URLs, or credentials are introduced. Per `README.md` "Notes", `.env` and the webhook URL remain untouched and uncommitted.

### Dependencies & Related Work
- Follows the existing disposable-E2E-fixture pattern: commits `5dd7a64` ("beforeLaunch hook fixture for sandbox-side hook E2E") and `5297643` ("feedback-outcome-test skill for e2e testing outcomeType=feedback").
- Tied to hula-server PR #831; tracking name `e2e-be27653-android`.

</details>

## Testing Strategy

- **Unit / integration:** None applicable — a README-only change affects no code path. `npm run typecheck` and `npm run test:contact` (defined per `ralph.md:22-31`) do not read `README.md`, so they are neither required nor affected.
- **Manual verification:**
  - `git diff README.md` shows exactly one added line and zero removed/changed lines.
  - The added line matches `<!-- hula-e2e e2e-<7-char-sha>-android -->` with a real SHA (no `<SHA7>` / `${...}` placeholder).
  - `tail -1 README.md` returns the marker; the file still ends with a single trailing newline.
  - `grep -c "hula-e2e" README.md` returns `1`.

## Documentation Updates

- No documentation content changes. `README.md` itself is the edited file, but the added HTML comment is invisible in rendered output and documents nothing user-facing.
- A new `.hublaunch/goals.md` is created to persist inferred project goals (per Q2 → A); this is pipeline context, not user documentation.

## Acceptance Criteria

- [ ] `README.md` has exactly one new final line of the form `<!-- hula-e2e e2e-<SHA7>-android -->`, with `<SHA7>` replaced by the actual 7-character launch SHA (no unexpanded placeholder committed).
- [ ] No other line of `README.md` is added, removed, or modified (`git diff` shows a single-line addition).
- [ ] The file still ends with a single trailing newline.
- [ ] `grep -c "hula-e2e" README.md` equals `1`.
- [ ] `.hublaunch/goals.md` exists with the inferred project goals.
- [ ] No build/test/lint command is affected (none read `README.md`).
- [ ] The PR is closed unmerged by the pipeline (lifecycle step, outside this code change).

## Assumptions

- `<SHA7>` is substituted with the concrete 7-char run SHA by the server/launch step; it is deliberately not hard-coded here because both `${process.env.SHA7}` and `${process.env.RUN_ID}` are unexpanded and unset in the planning sandbox.
- The marker is appended at end-of-file (after `README.md:85`), as no other placement was specified.
- "Close unmerged" is a PR-lifecycle instruction for the server, not part of the code deliverable.
- `.hublaunch/goals.md` content is inferred from `README.md`, `package.json`, and `ralph.md`; it is kept brief and is not a user-facing document.
