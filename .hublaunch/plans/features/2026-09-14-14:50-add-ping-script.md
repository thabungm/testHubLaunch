# Add a `scripts/ping.ts` Headless Script That Prints "pong" and a Timestamp

## Problem Statement

This is a synthetic, low-risk test plan used only to validate HubLaunch's
full plan-launch pipeline (issue creation, branch, sandbox dispatch, PR)
against the **preview** deployment while verifying PR #662's ActionRun/Task
sync fix hasn't regressed the plan-launch code path. Keep the implementation
trivial and self-contained, following the existing headless-script pattern
already used by `scripts/contact.ts`.

### Planning Context

**Key Requirements Discussed:**

- Purely a smoke test — the feature itself is intentionally trivial.
- Follow the zero-runtime-dependency, headless-script style already
  established in this repo (`scripts/contact.ts`, `CONTRIBUTING.md`'s
  "No Runtime Dependencies" section).

**Decisions Made:**

- Output format: a single line, `pong <ISO-8601 timestamp>`, to stdout.
- No CLI flags, no network calls, no secrets involved.

**Out of Scope:**

- No web server, no HTTP endpoint — console output only.

### Background & Context

**Current Behavior**: No script exists to do a trivial liveness self-check.

**Desired Behavior**: `npm run ping` prints `pong <ISO-8601 timestamp>` and
exits 0.

## Detailed Requirements

### Functional Requirements

1. **Ping script**
   - Prints `pong <new Date().toISOString()>` to stdout.
   - Exit code 0 always.

### Technical Requirements

- **Technology**: TypeScript, run via `tsx` (matches `contact`/`test:contact`
  scripts already in `package.json`).
- **Location**: `scripts/ping.ts` (new file, alongside `scripts/contact.ts`).
- **Dependencies**: None — use only `Date`, no imports needed.
- **Constraints**: No network calls, no secrets read or printed.

### Non-Functional Requirements

- **Performance**: N/A (trivial one-shot script).
- **Security**: No secrets involved.
- **Backwards Compatibility**: Purely additive — new file, new npm script.
- **Error Handling**: N/A — nothing in this script can throw.

## Proposed Solution

**High-level approach**: One new headless TypeScript script plus one new
`package.json` script entry that invokes it via `tsx`.

### Key Components

1. **`scripts/ping.ts`** — a single `console.log('pong ' + new Date().toISOString())`
   statement, no `main()` wrapper needed given the trivial size.

### Files Likely to Change

- `scripts/ping.ts` — new file, the script itself.
- `package.json` — add `"ping": "tsx scripts/ping.ts"` to the `scripts` block.

### Code Patterns to Follow

- Match the plain-Node-builtins, zero-dependency style used throughout this
  repo (see `CONTRIBUTING.md`).

**Anti-Patterns to Avoid:**

- Don't add CLI flags or a JSON-output mode — out of scope for this test plan.

## Implementation Steps

#### Phase 1: Script

- [ ] Create `scripts/ping.ts` implementing the behavior above.
- [ ] Add `"ping": "tsx scripts/ping.ts"` to the `scripts` block in `package.json`.

#### Phase 2: Verify

- [ ] Run `npm run ping` and confirm it prints `pong <timestamp>` with exit code 0.
- [ ] Run `npm run typecheck` and confirm it still passes with zero errors.
