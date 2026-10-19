# [DISPOSABLE E2E TEST] Write `HOOK_TEST_MARKER.md` proving the sandbox ran `.hublaunch/hooks/beforeLaunch.ts`

## Plan Summary

- **What/why:** A throwaway end-to-end smoke test that proves HubLaunch's sandbox-side `beforeLaunch` hook ran for the plan-execution session. The agent creates exactly one file, `HOOK_TEST_MARKER.md`, at the repo root, reporting four observed environment facts.
- **Key decision:** Values MUST be read live from the plan-execution process environment (via `node -e`/`printenv`), never copied from this plan or guessed. The hook's env mutations apply to the execution session, not the planning session, so the execution agent must observe them fresh.
- **Most important file:** The new `HOOK_TEST_MARKER.md` (the only file to create). Reference fixture: `.hublaunch/hooks/beforeLaunch.ts`.
- **Secrecy constraint:** Never emit the VALUE of `HOOK_SECRET_TEST` or `LAUNCH_TIMESTAMP` — only their set-ness (`true`/`false`). `HOOK_RAN_IN` and `RALPH_CONTAINER_MODE` values may be written.
- **Priority/complexity:** Low complexity, single-file create; the only real care points are reading env live, honoring the secrecy rule, and not touching any other file.

## Problem Statement

HubLaunch recently added sandbox-side execution of a `beforeLaunch` hook (hula-server PR #759). The fixture `.hublaunch/hooks/beforeLaunch.ts` is expected, when run by the sandbox before the agent session starts, to inject `LAUNCH_TIMESTAMP` and `HOOK_RAN_IN` into the agent's environment and to unset the forwarded `HOOK_SECRET_TEST` variable. We need positive, observable proof — from inside the running agent session — that this happened.

The proof is a single marker file whose contents are derived from the live process environment of the plan-execution agent.

#### Planning Context

**Key requirements**
- Create exactly one new file: `HOOK_TEST_MARKER.md` at the repository root.
- The file contains exactly these four lines, in this order, with placeholders replaced by REAL observed values:
  ```
  LAUNCH_TIMESTAMP set: <true|false>
  HOOK_RAN_IN: <the literal value of process.env.HOOK_RAN_IN, or "unset">
  HOOK_SECRET_TEST set: <true|false>
  RALPH_CONTAINER_MODE: <the literal value, or "unset">
  ```
- Observe values live with `node -e` or `printenv`; do not guess.

**Decisions made (with rationale)**
- **Read env at execution time, do not reuse planning-phase observations.** During this planning/initiate pass the sandbox process showed `LAUNCH_TIMESTAMP set: false`, `HOOK_RAN_IN: unset`, `HOOK_SECRET_TEST set: true`, `RALPH_CONTAINER_MODE: true` — i.e. the hook's env mutations were NOT present in the planning process. The most likely reason is that `beforeLaunch`'s env injection takes effect for the plan-execution agent session, not the planning pass. Therefore the execution agent MUST re-read the environment and write what it actually observes, which may differ from the planning snapshot. The input explicitly requires "write what you actually observe even if it differs."
- **"set" means defined.** A variable is "set" when `process.env.X !== undefined`, regardless of empty-string vs non-empty value. This matches how the hook and shell treat presence.
- **Secrecy:** Only set-ness is emitted for `HOOK_SECRET_TEST` and `LAUNCH_TIMESTAMP`; their values are never read into the file or printed. `HOOK_RAN_IN` and `RALPH_CONTAINER_MODE` values are written verbatim (or `unset`).
- **No config wiring needed.** No `hublaunch.config.*` exists in the repo; `beforeLaunch` orchestration is server-side (hula-server PR #759). The input forbids modifying other files, so nothing is registered here.

**Out of scope**
- Modifying any file other than creating `HOOK_TEST_MARKER.md`.
- Adding tests, documentation, or dependencies.
- Changing `.hublaunch/hooks/beforeLaunch.ts` or adding any config file.
- Opening a PR or committing (handled by the launch pipeline, not this task).

## Detailed Requirements

**Functional**
- Produce `HOOK_TEST_MARKER.md` at the repo root (`/workspace/HOOK_TEST_MARKER.md`) with exactly the four specified lines, labels and casing verbatim, in the given order.
- Line 1: `LAUNCH_TIMESTAMP set: true` if `process.env.LAUNCH_TIMESTAMP !== undefined`, else `false`.
- Line 2: `HOOK_RAN_IN: ` followed by the literal value of `process.env.HOOK_RAN_IN`, or the literal word `unset` if undefined.
- Line 3: `HOOK_SECRET_TEST set: true` if `process.env.HOOK_SECRET_TEST !== undefined`, else `false`.
- Line 4: `RALPH_CONTAINER_MODE: ` followed by the literal value of `process.env.RALPH_CONTAINER_MODE`, or `unset` if undefined.

**Technical**
- Read values from the live Node process environment of the execution session, e.g. a single `node -e` invocation that prints the four computed lines. `printenv` is acceptable for the value-bearing vars but must still translate presence into `true`/`false` for the two secret-protected vars without exposing their values.
- Write the file with a trailing newline conventional for markdown; the four content lines are the exact required payload.

**Non-Functional**
- **Secrecy:** never write or print the value of `HOOK_SECRET_TEST` or `LAUNCH_TIMESTAMP`.
- **Idempotency/cleanliness:** `HOOK_TEST_MARKER.md` does not currently exist at the repo root (verified), so this is a clean create, not an overwrite.
- **Isolation:** no other file is created or modified.

## Proposed Solution

Single step: inside the execution session, compute the four lines directly from `process.env` and write them to `HOOK_TEST_MARKER.md`. Because only set-ness is reported for the two sensitive variables, compute booleans in code rather than echoing values. Prefer one `node -e` command that both reads env and emits the exact four lines, which guarantees the secret values are never materialized in a file or log.

Example computation (illustrative — the agent should run this live, not transcribe its output from the plan):

```js
const b = (k) => process.env[k] !== undefined ? 'true' : 'false';
const v = (k) => process.env[k] !== undefined ? process.env[k] : 'unset';
const out = [
  `LAUNCH_TIMESTAMP set: ${b('LAUNCH_TIMESTAMP')}`,
  `HOOK_RAN_IN: ${v('HOOK_RAN_IN')}`,
  `HOOK_SECRET_TEST set: ${b('HOOK_SECRET_TEST')}`,
  `RALPH_CONTAINER_MODE: ${v('RALPH_CONTAINER_MODE')}`,
].join('\n') + '\n';
require('fs').writeFileSync('HOOK_TEST_MARKER.md', out);
```

<details><summary><b>Implementation Detail</b></summary>

### Implementation Steps

**Phase 1 — Observe the environment (live)**
- In the plan-execution session, read the four variables from the live process environment using `node -e` (preferred) or `printenv`.
- For `LAUNCH_TIMESTAMP` and `HOOK_SECRET_TEST`, compute only presence (`!== undefined`) → `true`/`false`; do NOT read or echo their values.
- For `HOOK_RAN_IN` and `RALPH_CONTAINER_MODE`, capture the literal value, or `unset` if undefined.

**Phase 2 — Write the marker file**
- Create `/workspace/HOOK_TEST_MARKER.md` containing exactly the four lines, in order, labels/casing verbatim, each on its own line, with a trailing newline.
- Do not create intermediate directories; the file lives at the repo root.

**Phase 3 — Self-verify (no other files touched)**
- Confirm the file has exactly four content lines and that neither secret value appears anywhere in the file.
- Confirm `git status` shows only `HOOK_TEST_MARKER.md` as added (plus any pre-existing untracked `.hublaunch/planning/` artifacts), and no other file modified.

### Edge Cases
- **`HOOK_RAN_IN` empty string vs unset:** if set to `""`, line 2 is `HOOK_RAN_IN: ` (empty after the space); only undefined yields `unset`. Same rule for `RALPH_CONTAINER_MODE`.
- **Secret var present but empty:** `HOOK_SECRET_TEST=""` still counts as set → `true` (it is defined). Never inspect the value to decide.
- **Observed values differ from the "hook ran" expectation:** write what is actually observed. The expected-if-ran outcome is `LAUNCH_TIMESTAMP set: true`, `HOOK_RAN_IN: sandbox`, `HOOK_SECRET_TEST set: false`, but the file must reflect reality even if it diverges.

### Risks & Mitigations
- **Risk: leaking a secret value by using `printenv` on `HOOK_SECRET_TEST`/`LAUNCH_TIMESTAMP`.** Mitigation: use the `node -e` boolean approach so the raw values are never printed or written.
- **Risk: copying the planning-phase snapshot instead of live values.** Mitigation: explicitly re-read env in the execution session; the planning snapshot is known to differ.
- **Risk: accidentally overwriting an existing file.** Mitigation: file confirmed absent; this is a clean create.

### Security Considerations
- The entire point of the secrecy rule is to prove that `unsetEnvVars` removed `HOOK_SECRET_TEST` without ever exposing its value. Keep to set-ness only for the two protected vars.

### Performance
- Negligible; one env read and one file write.

### Dependencies & Related Work
- Reference fixture: `.hublaunch/hooks/beforeLaunch.ts` (sandbox-vs-CLI detection at `.hublaunch/hooks/beforeLaunch.ts:29`; env injection/unset at `.hublaunch/hooks/beforeLaunch.ts:36-40`; stdout-contract at `.hublaunch/hooks/beforeLaunch.ts:44-45`).
- Hook contract documentation: `.hublaunch/hooks/README.md`.
- Server-side orchestration: hula-server PR #759 (external repo; not wired via a `hublaunch.config.*` here).
- Fixture provenance commit: `5dd7a64`.

</details>

## Technical Considerations
- **Dependencies:** none added. Node.js (`node`) is available in the sandbox and is the recommended tool for reading env without leaking secrets.
- **Config:** no `hublaunch.config.*` change; hook wiring is external (hula-server PR #759).
- **Security:** never materialize the values of `HOOK_SECRET_TEST` or `LAUNCH_TIMESTAMP`.

## Testing Strategy
- **Unit:** n/a (no code module; the "logic" is four env reads).
- **Integration:** after writing, re-read `HOOK_TEST_MARKER.md` and confirm it has exactly four lines matching the required labels/format; confirm the two secret values do not appear in the file.
- **Manual:**
  - `cat HOOK_TEST_MARKER.md` → four lines, correct labels/order.
  - `git status --porcelain` → only `HOOK_TEST_MARKER.md` newly added (aside from pre-existing untracked planning artifacts); no other tracked file modified.
  - Grep the file to ensure no accidental secret-looking value was written for the protected vars.

## Documentation Updates
- None. The input forbids adding docs; this is a disposable test marker.

## Acceptance Criteria
- [ ] `HOOK_TEST_MARKER.md` exists at the repository root and is the only newly created/modified file for this task.
- [ ] It contains exactly four lines, in order, with labels/casing verbatim:
      `LAUNCH_TIMESTAMP set: <true|false>`, `HOOK_RAN_IN: <value|unset>`, `HOOK_SECRET_TEST set: <true|false>`, `RALPH_CONTAINER_MODE: <value|unset>`.
- [ ] The `true/false` values for `LAUNCH_TIMESTAMP` and `HOOK_SECRET_TEST` reflect live `process.env` set-ness observed in the execution session.
- [ ] The literal values for `HOOK_RAN_IN` and `RALPH_CONTAINER_MODE` reflect live `process.env` (or `unset`).
- [ ] The values of `HOOK_SECRET_TEST` and `LAUNCH_TIMESTAMP` appear nowhere in the file or any log output.
- [ ] No other file is created, modified, or deleted; no tests, docs, or dependencies added; no PR opened or commit made by this task.

## Assumptions
- The execution agent will re-read the environment at execution time rather than reuse the planning-phase snapshot, because `beforeLaunch`'s env injection may only take effect for the plan-execution session (consistent with "write what you actually observe"). During planning the sandbox showed `LAUNCH_TIMESTAMP set: false`, `HOOK_RAN_IN: unset`, `HOOK_SECRET_TEST set: true`, `RALPH_CONTAINER_MODE: true`.
- "set" means the variable is defined (`process.env.X !== undefined`), independent of empty-string vs non-empty value.
- The four output lines are reproduced verbatim (exact labels, casing, order) from the input.
- A trailing newline at end of file is acceptable and conventional for the marker.
