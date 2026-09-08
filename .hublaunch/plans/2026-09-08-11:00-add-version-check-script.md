# Add a `version` Script That Prints Package Version and Git SHA

## Problem Statement

testHubLaunch has no quick way to check which package version and git commit a checked-out working tree corresponds to without manually opening `package.json` and running `git rev-parse`. This adds a small headless script, `npm run version`, that prints both in one command.

### Planning Context

**Key Requirements Discussed:**

- This is a synthetic, low-risk test plan used only to validate HubLaunch's plan-branch flow (branch created at plan time, server checks out the existing branch instead of creating one). Keep the implementation trivial and self-contained.
- Follow the existing headless-script pattern already used by `scripts/contact.ts` and `scripts/health.ts` — no web server, console output only.

**Decisions Made:**

- Output format: plain text, one field per line (`version: X`, `commit: Y`), so it's easy to grep in CI or scripts.
- Git SHA is read via `git rev-parse HEAD` at runtime (not baked in at build time), since this is a dev script, not a build artifact.
- If not inside a git repo (rev-parse fails), print `commit: unknown` instead of throwing — the script must not crash just because git metadata is unavailable.

**Out of Scope:**

- No package.json version bump automation.
- No CLI flags — a single fixed output format is enough for this test script.

### Background & Context

**Current Behavior**: No way to print version/commit info from a script; must inspect `package.json` and run `git rev-parse HEAD` manually.

**Desired Behavior**: `npm run version` prints both in one command with zero required setup (no env vars, no network calls).

## Detailed Requirements

### Functional Requirements

1. **Version Script**
   - Read `version` from the repo's `package.json`.
   - Read the current commit SHA via `git rev-parse HEAD`, run from the repo root.
   - Print:
     ```
     version: <package.json version>
     commit: <git sha, or "unknown" if git rev-parse fails>
     ```
   - Exit code 0 always (this is an informational script, never a failure signal).

### Technical Requirements

- **Technology**: TypeScript, run via `tsx` (matches the project's existing `contact`/`health` scripts).
- **Location**: `scripts/version.ts` (new file, root-level `scripts/` dir alongside `contact.ts` and `health.ts`).
- **Dependencies**: Zero new npm dependencies — use Node's built-in `child_process.execSync` for git, and `fs.readFileSync` + `JSON.parse` for `package.json` (same zero-runtime-dependency policy as the rest of the repo, per `CONTRIBUTING.md`).
- **Constraints**: Must run in Node 18+, no network calls, no secrets involved.

### Non-Functional Requirements

- **Performance**: N/A (trivial one-shot script).
- **Security**: No secrets read or printed. No user input taken.
- **Backwards Compatibility**: Purely additive — new file, new npm script, no existing behavior changes.
- **Error Handling**: `git rev-parse HEAD` failure must be caught and replaced with `commit: unknown`; the script must never throw or exit non-zero.

## Proposed Solution

**High-level approach**: Add one new headless TypeScript script plus one new `package.json` script entry that invokes it via `tsx`.

### Key Components

1. **`scripts/version.ts`**
   - Reads `package.json` from the repo root (`path.join(process.cwd(), 'package.json')`).
   - Runs `execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()` inside a `try`/`catch`; on failure, use the string `'unknown'`.
   - Logs the two-line output described above via `console.log`.

### Files Likely to Change

- `scripts/version.ts` — new file, the script itself.
- `package.json` — add a `"version-check": "tsx scripts/version.ts"` script entry (named `version-check` to avoid colliding with npm's built-in `version` lifecycle script name).
- `README.md` — add one line under the existing "Usage" / scripts section documenting `npm run version-check`.

### Code Patterns to Follow

- **For script structure**: Follow `scripts/health.ts`'s top-of-file style — a single `main()` function invoked at the bottom of the file, no exported API surface needed (this is a CLI-only script, not an importable module).
- **For reading `package.json`**: Use `fs.readFileSync(path, 'utf-8')` + `JSON.parse`, matching the plain-Node-builtins style used throughout the repo (see `CONTRIBUTING.md`'s "No Runtime Dependencies" section).

**Anti-Patterns to Avoid:**

- Don't add a JSON-output mode or CLI flags — out of scope, adds untested surface area for what is meant to be a minimal test plan.
- Don't shell out with `exec` (async) — use synchronous `execSync` since this is a tiny one-shot script with no need for concurrency.

## Implementation Steps

#### Phase 1: Script

- [ ] Create `scripts/version.ts` implementing the behavior in "Key Components" above.
- [ ] Add `"version-check": "tsx scripts/version.ts"` to the `scripts` block in `package.json`.

#### Phase 2: Documentation

- [ ] Add a one-line entry to `README.md`'s existing scripts/usage section: `npm run version-check` → prints package version and current git commit SHA.

#### Phase 3: Verify

- [ ] Run `npm run version-check` and confirm it prints two lines (`version: ...`, `commit: ...`) with no errors.
- [ ] Run `npm run typecheck` and confirm it still passes with zero errors.

## Edge Cases & Considerations

#### Edge Cases to Handle

1. **Not inside a git repo / `git` not on PATH**: `git rev-parse HEAD` throws — caught, script prints `commit: unknown` and still exits 0.
2. **`package.json` missing a `version` field**: Print `version: unknown` in that case too (same fallback pattern), rather than crashing on `undefined`.

#### Security Considerations

- No secrets, tokens, or env vars are read or printed by this script.

## Technical Considerations

#### Dependencies

- None — Node built-ins only (`node:child_process`, `node:fs`).

#### Error Handling Strategies

- Wrap both the `package.json` read/parse and the `git rev-parse` call in their own `try`/`catch`, each falling back to `'unknown'` independently, so a failure in one doesn't suppress the other's output.

## Testing Requirements

#### Manual Testing Checklist

1. **Setup**: None required — no env vars needed.
2. **Test Case 1**: Run `npm run version-check` from the repo root.
   - Expected result: prints `version: <value from package.json>` then `commit: <40-char sha>`, exits 0.
3. **Test Case 2**: Temporarily rename `.git` (or run from a tmp copy without `.git`) and run the script again.
   - Expected result: prints `commit: unknown` instead of throwing.

## Documentation Updates

- [ ] Update `README.md` with the new `npm run version-check` usage line.

## Acceptance Criteria

- [ ] **AC1**: `scripts/version.ts` exists and `npm run version-check` runs it successfully.
- [ ] **AC2**: Output is exactly two lines: `version: <value>` and `commit: <value>`.
- [ ] **AC3**: Script exits 0 even when git metadata is unavailable (prints `commit: unknown` instead of throwing).
- [ ] **AC4**: `npm run typecheck` passes with zero errors after the change.
- [ ] **AC5**: `README.md` documents the new script.

#### Definition of Done

- All acceptance criteria met.
- `npm run typecheck` passes.
- No new npm dependencies added.
- No breaking changes to existing scripts.
