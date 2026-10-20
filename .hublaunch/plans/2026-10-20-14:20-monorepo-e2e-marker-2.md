# [DISPOSABLE E2E TEST] Write `MONOREPO_E2E_MARKER_2.md` proving a launch through the monorepo preview server (round 2, after CLI fixes)

## Plan Summary

- **What/why:** A throwaway end-to-end smoke test for hula-server PR #773 (the `hub-launch` CLI merged into the `hula-server` monorepo), round 2: re-run after the `hula launch --show` and `hula script fix-setup` CLI fixes landed on the PR branch. The CLI built from the monorepo launches this plan against the Vercel `preview` deployment of the monorepo branch. The agent creates exactly one file, `MONOREPO_E2E_MARKER_2.md`, at the repo root, with a few facts observed live inside the sandbox.
- **Key decision:** Every value MUST be read live from the sandbox (via `node -e` / shell), never copied from this plan or guessed.
- **Most important file:** The new `MONOREPO_E2E_MARKER_2.md` (the only file to create).
- **Secrecy constraint:** Never print or write the value of any environment variable other than the ones named below. `RALPH_CONTAINER_MODE` may be written verbatim.
- **Priority/complexity:** Low complexity, single-file create. No tests, docs, or dependencies.

## Problem Statement

hula-server PR #773 moves the `hub-launch` CLI into `packages/hub-launch/` of the `hula-server` monorepo and adds per-package build/deploy/release isolation. The server itself is meant to be byte-for-byte unchanged, but the Vercel build, install, and lockfile changed. We need observable proof that a real launch still works end to end through a server deployed from the monorepo branch: issue created, sandbox started, agent ran, PR opened.

The proof is a single marker file whose contents are derived from the live sandbox environment.

#### Planning Context

**Key requirements**
- Create exactly one new file: `MONOREPO_E2E_MARKER_2.md` at the repository root.
- The file contains exactly these four lines, in this order, with placeholders replaced by REAL observed values:
  ```
  Generated at (UTC): <ISO-8601 timestamp from `new Date().toISOString()`>
  Node version: <output of `process.version`>
  RALPH_CONTAINER_MODE: <the literal value of process.env.RALPH_CONTAINER_MODE, or "unset">
  hub-launch CLI in sandbox: <output of `hula --version`, or "not installed" if the command is missing>
  ```
- Observe values live; do not guess.

**Decisions made (with rationale)**
- **Single file, nothing else.** The point is to exercise the launch pipeline on the monorepo-built server, not to change the project.
- **"unset" means undefined.** A variable is written as `unset` when `process.env.X === undefined`.
- **No secrets.** Only the four values above are written. No other environment variable value is read into the file or printed.

**Out of scope**
- Modifying any file other than creating `MONOREPO_E2E_MARKER_2.md`.
- Adding tests, documentation, or dependencies.
- Changing hooks, config, or `ralph.md`.
- Opening a PR or committing (handled by the launch pipeline, not this task).

## Detailed Requirements

**Functional**
- Produce `MONOREPO_E2E_MARKER_2.md` at the repo root with exactly the four specified lines, labels and casing verbatim, in the given order, each terminated by a newline.
- Line 1: `Generated at (UTC): ` followed by `new Date().toISOString()` evaluated in the sandbox.
- Line 2: `Node version: ` followed by `process.version`.
- Line 3: `RALPH_CONTAINER_MODE: ` followed by the literal value of `process.env.RALPH_CONTAINER_MODE`, or `unset` if undefined.
- Line 4: `hub-launch CLI in sandbox: ` followed by the trimmed stdout of `hula --version`, or `not installed` if the command is not on PATH.

**Technical**
- Prefer one `node -e` invocation that computes all four lines and writes the file, using `child_process.execSync('hula --version')` wrapped in try/catch for line 4.
- Write the file with a trailing newline.

**Non-Functional**
- **Secrecy:** never write or print any environment variable value other than `RALPH_CONTAINER_MODE`.
- **Idempotency/cleanliness:** `MONOREPO_E2E_MARKER_2.md` does not currently exist at the repo root, so this is a clean create, not an overwrite.
- **Isolation:** no other file is created or modified.

## Proposed Solution

Single step: inside the execution session, compute the four lines directly from the live process and write them to `MONOREPO_E2E_MARKER_2.md`.

Example (illustrative — the agent must run this live, not transcribe its output from the plan):

```js
const { execSync } = require('child_process');
let cli = 'not installed';
try { cli = execSync('hula --version', { encoding: 'utf8' }).trim(); } catch {}
const v = (k) => process.env[k] !== undefined ? process.env[k] : 'unset';
const out = [
  `Generated at (UTC): ${new Date().toISOString()}`,
  `Node version: ${process.version}`,
  `RALPH_CONTAINER_MODE: ${v('RALPH_CONTAINER_MODE')}`,
  `hub-launch CLI in sandbox: ${cli}`,
].join('\n') + '\n';
require('fs').writeFileSync('MONOREPO_E2E_MARKER_2.md', out);
```

## Implementation Steps

**Phase 1 — Observe the environment (live)**
- In the execution session, compute the four values from the live process as shown above.

**Phase 2 — Write the marker file**
- Create `MONOREPO_E2E_MARKER_2.md` at the repo root containing exactly the four lines, in order, with a trailing newline.
- Do not create or modify any other file.

**Phase 3 — Verify**
- `cat MONOREPO_E2E_MARKER_2.md` shows four lines with the expected labels.
- `git status --porcelain` shows only the new `MONOREPO_E2E_MARKER_2.md`.

## Acceptance Criteria

- [ ] `MONOREPO_E2E_MARKER_2.md` exists at the repo root and contains exactly four lines with the labels `Generated at (UTC):`, `Node version:`, `RALPH_CONTAINER_MODE:`, and `hub-launch CLI in sandbox:` in that order.
- [ ] The timestamp on line 1 is a valid ISO-8601 UTC timestamp from the time of the run.
- [ ] Line 2 is a real Node version string (e.g. `v20.x.y` or `v22.x.y`).
- [ ] No other file in the repository is added, modified, or deleted.
- [ ] No secret values appear anywhere in the file.
