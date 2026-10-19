# Create fallback marker file when the `beforeLaunch` hook fails to abort the run

## Plan Summary

- **What / why:** This is a disposable end-to-end test of HubLaunch's sandbox-side `beforeLaunch` hook *failure* path. The `hook-fail-test` branch on origin ships a `beforeLaunch.ts` that always exits `1`, so the implementation run is **expected to be aborted by the hook before any agent work happens**. The work described here is the deliberate *fallback*: it runs ONLY if the hook failed to abort — which itself constitutes the test failing.
- **Key decision:** On the (failure-signalling) path where the run is not aborted, create exactly one new file and change nothing else, so the escape is maximally observable and trivially reversible.
- **Most important file:** the new repo-root marker `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md` — its mere presence after a run is the signal that the hook did not do its job.
- **Priority / complexity:** Low complexity (single file, one line), but high diagnostic value — a green test produces zero file changes; any diff at all is a failure.

## Problem Statement

HubLaunch runs a sandbox-side `beforeLaunch` hook before any agent work begins. By contract, a non-zero exit from that hook aborts the launch. The `hook-fail-test` branch exists on origin specifically to exercise this abort path: its `.hublaunch/hooks/beforeLaunch.ts` always exits `1`. The correct, passing outcome of this E2E test is that the implementation run never starts — the agent should never reach the task body, and the working tree should remain untouched.

Because the plan is executed inside the sandbox, we still need a defined behaviour for the degenerate case where the hook did **not** abort. That fallback must be unmistakable: it should leave behind a single, clearly-named marker file whose existence proves the guard was bypassed.

#### Planning Context

**Key requirements**
- The run is expected to be aborted by the `beforeLaunch` hook on the `hook-fail-test` branch; no agent work should occur. The task body below is reached only on failure.
- If (and only if) the task body is reached, create exactly one new file at the repository root: `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md`.
- The file must contain the single line: `the beforeLaunch hook did not abort this run`.
- Do not modify, create, or delete any other file.

**Decisions made (with rationale)**
- *File location = git repo root (`/workspace`).* No `folder` flag was given, and the request says "at the repository root". Placing it at the root (not inside `.hublaunch/` or any subfolder) makes an accidental escape maximally visible in a diff. (Repo root confirmed to not currently contain this file.)
- *Single file, no other changes.* The value of this fixture is that a passing test yields an empty diff. Any extra file touch would dilute that signal, so the fallback is intentionally minimal.
- *Trailing newline acceptable.* The requirement specifies the line content, not byte-exact framing; a single trailing newline is conventional and acceptable.

**Out of scope**
- Changing, "fixing", or inspecting the `beforeLaunch` hook itself. The hook is the component under test; the implementation run executes against the `hook-fail-test` branch's exit-1 variant and must not be altered.
- Any tests, build steps, or verification beyond creating the marker file.
- Opening a PR or committing (the planning pass does neither; the implementation run follows its standard flow).

## Detailed Requirements

**Functional**
- When the task body executes, a file named exactly `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md` exists at the repository root.
- Its contents are exactly the line `the beforeLaunch hook did not abort this run` (a single trailing newline permitted).
- No other path in the working tree is added, modified, or removed.

**Technical**
- Target path: `/workspace/HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md` (repo-relative: `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md`).
- Encoding: UTF-8, plain text, LF line ending.

**Non-Functional**
- Idempotent intent: the file is not expected to pre-exist (confirmed absent); if it somehow does, overwriting it with the specified single line is acceptable and keeps the observable outcome identical.
- Zero side effects elsewhere — the diff, if the hook failed, should be exactly one added file.

## Proposed Solution

If control ever reaches the task body (i.e., the hook did not abort), write one file at the repo root with the exact required contents, then stop. There is no multi-component interaction and no diagram is warranted — this is a single-file write whose entire purpose is to make a guard bypass observable.

The expected real-world outcome of this E2E test, by contrast, is that this solution is **never executed** because the `beforeLaunch` hook on the `hook-fail-test` branch exits non-zero and aborts the launch first.

## Implementation Steps

**Phase 1 — Create the marker file (only if reached)**
1. Create `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md` at the repository root (`/workspace/HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md`).
2. Set its contents to the single line:
   ```
   the beforeLaunch hook did not abort this run
   ```
3. Make no other change to the working tree.

## Technical Considerations

- **Dependencies:** None. No packages, config, or build tooling involved.
- **Config:** None.
- **Security:** None. The file contains a fixed diagnostic string and no secrets or executable content.
- **Interaction with the hook contract:** The abort-on-nonzero-exit contract is documented at `.hublaunch/hooks/beforeLaunch.ts:11` and implemented via `process.exit(1)` in the catch handler at `.hublaunch/hooks/beforeLaunch.ts:48-51` (on the `main` planning branch this is the *passing* fixture; the `hook-fail-test` branch reuses the same `process.exit(1)` mechanism unconditionally). Do not touch this file.

<details><summary><b>Implementation Detail</b></summary>

### Edge Cases
- **File already present at root:** Confirmed absent in the current snapshot. If present at execution time, overwrite with the exact single line — the observable result (marker exists with the specified content) is unchanged.
- **Hook aborted the run (expected path):** The task body never runs; no file is created; the working tree is clean. This is the passing outcome and requires no action.
- **Accidental extra edits:** Any change beyond the single marker file is a defect — it would obscure the "empty diff on success" signal. Keep the change to exactly one added file.

### Testing Strategy
- **Unit / integration:** None required; the fallback task is itself the observable artifact of a test harness.
- **Manual verification (only if the task body ran):**
  - `test -f HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md` at the repo root returns success.
  - The file's sole line equals `the beforeLaunch hook did not abort this run`.
  - `git status --porcelain` shows exactly one untracked/added path and nothing else.
- **Expected end-to-end result:** The hook aborts the launch, so none of the above runs and the tree stays clean.

### Documentation Updates
- None. This is a disposable test fixture; no user-facing or developer docs change.

### Rollback / Cleanup
- The marker file is disposable. Deleting `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md` fully reverts the change.

### Dependencies & Related Work
- Related fixture files (do not modify): `.hublaunch/hooks/beforeLaunch.ts` (hook under test), `.hublaunch/hooks/README.md` (hook contract docs), `.hublaunch/hooks/deploymentStartupScript.ts` (sibling hook, uninvolved).

</details>

## Acceptance Criteria

- **Primary (expected):** The `beforeLaunch` hook on the `hook-fail-test` branch exits non-zero and aborts the launch before any agent work; the working tree is unchanged and `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md` does **not** exist. (A clean, empty diff is the pass condition.)
- **Fallback (failure signal):** If the run was not aborted, exactly one new file exists at the repo root — `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md` — containing the single line `the beforeLaunch hook did not abort this run`, and no other file was changed.

## Assumptions

- The planning pass runs on `main` (which carries the *passing* hook fixture) while the implementation run checks out the `hook-fail-test` branch (which carries the exit-1 variant), per `input.md`; the failing hook therefore need not be present in this snapshot.
- The marker file is created only on the failure path where the hook did not abort; a successful test produces no file changes at all.
- The marker file belongs at the git repository root (`/workspace`), not inside `.hublaunch/` or any subfolder (no `folder` flag was given).
- A single trailing newline after the required line is acceptable; no other content is added.
- No tests, build, or verification are expected beyond creating the file, since the task exists solely to make a hook-bypass observable.
