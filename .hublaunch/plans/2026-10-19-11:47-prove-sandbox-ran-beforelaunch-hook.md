# [DISPOSABLE E2E TEST] Write `HOOK_TEST_MARKER.md` proving the sandbox ran `beforeLaunch.ts`

## Plan Summary

- **What/why:** Create one new file, `HOOK_TEST_MARKER.md`, at the repository root whose four lines report the live state of four environment variables — this is a throwaway end-to-end smoke test proving HubLaunch's sandbox-side `beforeLaunch` hook ran (and applied its `envVars`/`unsetEnvVars`) before this implementation session started. It is **not** a feature.
- **Key decision:** Values must be read from the implementation session's *own* `process.env` at write time (via `node -e`/`printenv`), **never guessed or copied** from the planning pass. The planning-pass snapshot is explicitly informational only.
- **Secret discipline:** Never emit the *values* of `HOOK_SECRET_TEST` or `LAUNCH_TIMESTAMP` — only `set: true|false`. The literal values of `HOOK_RAN_IN` and `RALPH_CONTAINER_MODE` may be written. This mirrors the hook's own presence-only logging at `.hublaunch/hooks/beforeLaunch.ts:32-33`.
- **Most important file:** The new `HOOK_TEST_MARKER.md` (repo root). The hook under test is `.hublaunch/hooks/beforeLaunch.ts`.
- **Priority/complexity:** High priority (gates verification of PR #759 sandbox hook execution), trivial complexity (one file, four lines, no dependencies, no other file touched).

## Problem Statement

HubLaunch is validating sandbox-side execution of the `beforeLaunch` hook (hula-server PR #759). The hook `.hublaunch/hooks/beforeLaunch.ts` is supposed to run inside the launch sandbox *before* the agent session begins and to mutate the session environment:

- It **injects** `envVars`: `LAUNCH_TIMESTAMP` (an ISO timestamp) and `HOOK_RAN_IN` (`"sandbox"` when `RALPH_CONTAINER_MODE === 'true'`, else `"cli"`).
- It **unsets** `HOOK_SECRET_TEST` (a variable otherwise forwarded from `.env`).

If and only if the hook actually ran in the sandbox and its output was applied, the agent session that implements this plan should observe: `LAUNCH_TIMESTAMP` present, `HOOK_RAN_IN=sandbox`, and `HOOK_SECRET_TEST` absent. The marker file is the observable artifact that captures what the session actually sees, so a human/CI can confirm the hook contract end to end.

#### Planning Context

**Key requirements**
- Create exactly one new file: `HOOK_TEST_MARKER.md` at the repository root (`/workspace/HOOK_TEST_MARKER.md`).
- The file contains exactly these four lines, in this exact order and spelling, with placeholders replaced by live observed values:
  ```
  LAUNCH_TIMESTAMP set: <true|false>
  HOOK_RAN_IN: <the literal value of process.env.HOOK_RAN_IN, or "unset">
  HOOK_SECRET_TEST set: <true|false>
  RALPH_CONTAINER_MODE: <the literal value, or "unset">
  ```
- Modify no other file; add no tests, docs, or dependencies.

**Decisions made (with rationale)**
- **Read env at write time, in the implementation session.** "This sandbox's process environment" means the session that creates the file, not the planning pass. The hook's effects (inject/unset) are applied by the HubLaunch launch machinery to the agent session; only that session sees the post-hook environment. Hardcoding planning-pass values would defeat the entire test. (See Assumptions.)
- **Presence test uses `!== undefined`.** An exported-but-empty variable still counts as "set". This matches the request's intent that `set` means "present in `process.env`". Rationale: distinguishes a genuinely unset var from one deliberately set to empty.
- **Value lines fall back to the literal string `unset`** when the variable is `undefined`, matching the request's `<..., or "unset">` placeholder spec.
- **Secret-safe output.** Only presence is reported for `HOOK_SECRET_TEST` and `LAUNCH_TIMESTAMP`; their values are never written or printed. This follows the exact discipline the hook itself uses when logging `HOOK_SECRET_TEST` presence (`.hublaunch/hooks/beforeLaunch.ts:32-33`).
- **Record reality, not the expectation.** The expected sandbox outcome is `LAUNCH_TIMESTAMP set: true`, `HOOK_RAN_IN: sandbox`, `HOOK_SECRET_TEST set: false`. But the implementor must write whatever is actually observed, even if it differs — the file's value is as evidence, not as a rubber stamp.

**Out of scope**
- Running, modifying, or re-implementing the hook (`beforeLaunch.ts`) itself.
- Any change to `.env`, config files, or launch machinery — the hook's `envVars`/`unsetEnvVars` are applied by HubLaunch, not by this task.
- Tests, documentation, dependencies, or any file other than the single new marker file.
- Opening a PR or committing (handled by the launch flow, not this plan).

## Detailed Requirements

**Functional**
- A new file `HOOK_TEST_MARKER.md` exists at the repo root with exactly four lines (plus an optional single trailing newline).
- Line 1 reports whether `LAUNCH_TIMESTAMP` is set (`true`/`false`), never its value.
- Line 2 reports the literal value of `HOOK_RAN_IN`, or `unset` if undefined.
- Line 3 reports whether `HOOK_SECRET_TEST` is set (`true`/`false`), never its value.
- Line 4 reports the literal value of `RALPH_CONTAINER_MODE`, or `unset` if undefined.
- All four values are read live from the implementation session's `process.env`.

**Technical**
- Env must be read via `node -e` or `printenv` in the implementation session; values must not be guessed, inferred, or carried over from the planning pass.
- Presence (`set:`) uses `process.env.X !== undefined`.
- Value lines (`HOOK_RAN_IN:`, `RALPH_CONTAINER_MODE:`) emit the literal string, or `unset` when `undefined`.
- No trailing content beyond the four lines.

**Non-Functional**
- Secret safety: the values of `HOOK_SECRET_TEST` and `LAUNCH_TIMESTAMP` are never written to the file nor printed to any log/stdout.
- Determinism: output reflects a single, consistent read of the environment.
- Minimal footprint: exactly one file created, zero other files modified.

## Proposed Solution

High-level approach (single step, no components to coordinate):

1. In the implementation session, read the four variables directly from `process.env` using Node, computing presence with `!== undefined` and value-or-`unset` for the two value lines — in a single command so output is derived, not hand-typed.
2. Write the resulting four lines verbatim into `/workspace/HOOK_TEST_MARKER.md`.
3. Confirm no other file changed.

A recommended one-shot command that both derives and writes the file (keeps the two secret-guarded values out of any printed output):

```bash
node -e '
const p = process.env;
const setFlag = (k) => (p[k] !== undefined ? "true" : "false");
const val = (k) => (p[k] !== undefined ? p[k] : "unset");
const lines = [
  `LAUNCH_TIMESTAMP set: ${setFlag("LAUNCH_TIMESTAMP")}`,
  `HOOK_RAN_IN: ${val("HOOK_RAN_IN")}`,
  `HOOK_SECRET_TEST set: ${setFlag("HOOK_SECRET_TEST")}`,
  `RALPH_CONTAINER_MODE: ${val("RALPH_CONTAINER_MODE")}`,
];
require("fs").writeFileSync("HOOK_TEST_MARKER.md", lines.join("\n") + "\n");
console.log("wrote HOOK_TEST_MARKER.md");
'
```

This derives every line from the live environment and never echoes the secret/timestamp values. The implementor may instead read the four computed line strings and write them with the editor — but the values must still originate from a live `process.env` read, not from this plan.

<details><summary><b>Implementation Detail</b></summary>

### Implementation Steps

**Phase 1 — Observe the environment (live)**
- In the implementation session, run a `node -e` snippet (or `printenv`) that reports, for each of the four variables, presence and — for `HOOK_RAN_IN` and `RALPH_CONTAINER_MODE` only — the literal value. Do **not** print the values of `HOOK_SECRET_TEST` or `LAUNCH_TIMESTAMP`.
- Pattern to follow for sandbox detection and presence-only logging: `.hublaunch/hooks/beforeLaunch.ts:29` (`RALPH_CONTAINER_MODE === 'true'`) and `.hublaunch/hooks/beforeLaunch.ts:32-33` (presence-only `present/absent` logging).

**Phase 2 — Write the marker file**
- Write `/workspace/HOOK_TEST_MARKER.md` containing exactly the four lines, in order, using the observed values (see Proposed Solution command, or write the derived strings with the editor).
- Do not add a title, comments, blank leading lines, or any fifth line. A single trailing newline is acceptable.

**Phase 3 — Verify**
- Confirm the file exists at repo root and has exactly four content lines.
- Confirm no other file was created or modified (`git status --porcelain` should show only the new `HOOK_TEST_MARKER.md`, alongside the pre-existing untracked `.hublaunch/planning/` artifacts).
- Confirm neither secret value appears anywhere in the file.

### Edge Cases
- **Variable set to empty string:** still reported as `set: true` (presence via `!== undefined`); for value lines an empty string is written literally (empty after the colon), not `unset`.
- **`HOOK_RAN_IN` undefined:** line 2 becomes `HOOK_RAN_IN: unset`.
- **`RALPH_CONTAINER_MODE` undefined:** line 4 becomes `RALPH_CONTAINER_MODE: unset`.
- **Observed values differ from the expected sandbox outcome:** write what is actually observed; a mismatch is a legitimate (and informative) test result, not an error to "fix".
- **File already exists (unexpected):** it was confirmed absent at the planning commit; if it exists at implementation time, overwrite it with the freshly observed four lines rather than appending.

### Error Handling
- If the `node -e` snippet fails (e.g., Node unavailable), fall back to `printenv`/shell parameter expansion to derive the same four lines, preserving the presence-only rule for the two guarded variables. Do not block on the hook — the task only observes and records.

### Security
- The only sensitive concern is leaking `HOOK_SECRET_TEST` or `LAUNCH_TIMESTAMP` values. Mitigation: never interpolate those two values into output or logs; report presence only. The provided command already enforces this.

### Performance
- Negligible — one env read and one small file write.

### Dependencies & Related Work
- Hook under test: `.hublaunch/hooks/beforeLaunch.ts` (emits `envVars = {LAUNCH_TIMESTAMP, HOOK_RAN_IN}`, `unsetEnvVars = ["HOOK_SECRET_TEST"]`; lines 36-45).
- Hook mechanism/contract: `.hublaunch/hooks/README.md`.
- Related: hula-server PR #759 (sandbox-side hook execution for remote launches); commit `5dd7a64` ("test: beforeLaunch hook fixture for sandbox-side hook E2E").

</details>

## Technical Considerations

- **Dependencies:** none added. Uses Node (already required to run `tsx` hooks) or coreutils `printenv`.
- **Config:** none. No `hublaunch.config.*` exists in the repo; hook behavior is fully defined by `beforeLaunch.ts`.
- **Security:** presence-only reporting for `HOOK_SECRET_TEST` and `LAUNCH_TIMESTAMP`; values never written or logged.
- **Repo drift:** current checkout is at commit `5dd7a64`, matching the Repo Snapshot — no drift. `HOOK_TEST_MARKER.md` confirmed absent at this commit.

## Testing Strategy

- **Unit:** n/a (no code module is added).
- **Integration / E2E:** this file *is* the E2E assertion artifact. Validation = inspecting the four lines. In a correctly functioning sandbox launch they should read `LAUNCH_TIMESTAMP set: true`, `HOOK_RAN_IN: sandbox`, `HOOK_SECRET_TEST set: false`, and `RALPH_CONTAINER_MODE: true`.
- **Manual:**
  - `cat HOOK_TEST_MARKER.md` → exactly four lines in the specified order.
  - `git status --porcelain` → only `HOOK_TEST_MARKER.md` is newly added (plus pre-existing untracked planning artifacts); no other tracked file changed.
  - `grep -c .` confirms four content lines; verify the two guarded values are absent from the file.

## Documentation Updates

None. The request explicitly forbids adding docs. (The hook contract is already documented in `.hublaunch/hooks/README.md`; no change needed.)

## Acceptance Criteria

- [ ] `HOOK_TEST_MARKER.md` exists at the repository root.
- [ ] It contains exactly these four lines, in this order and spelling, with real observed values substituted:
  - `LAUNCH_TIMESTAMP set: <true|false>`
  - `HOOK_RAN_IN: <value or "unset">`
  - `HOOK_SECRET_TEST set: <true|false>`
  - `RALPH_CONTAINER_MODE: <value or "unset">`
- [ ] The four values were read live from the implementation session's `process.env` (not guessed or copied from planning).
- [ ] Presence lines use `!== undefined` semantics (empty-but-exported counts as `true`).
- [ ] The values of `HOOK_SECRET_TEST` and `LAUNCH_TIMESTAMP` appear nowhere in the file or logs.
- [ ] No file other than `HOOK_TEST_MARKER.md` is created or modified; no tests, docs, or dependencies are added.

## Assumptions

- "This sandbox's process environment" refers to the **implementation session** that writes the file, not this planning pass; the implementor re-reads the env at write time.
- The planning-pass env snapshot (hook outputs not yet applied) is informational only and must **not** be hardcoded into the marker file.
- "set" means present in `process.env` (`!== undefined`), regardless of empty value.
- The four lines appear in the exact order/spelling given, one value per line, matching the request's fenced block verbatim; a single trailing newline is acceptable.
- Only `HOOK_SECRET_TEST` and `LAUNCH_TIMESTAMP` are value-restricted (presence-only); `HOOK_RAN_IN` and `RALPH_CONTAINER_MODE` literal values are safe to write.
- The file contains only the four specified lines — no extra commentary, headers, or secret values.
- No `.env`, config, or other file is touched; the hook's `envVars`/`unsetEnvVars` are applied by the HubLaunch launch machinery, not by this task.
