# Add a Formal Greeting Helper Under `src/` With Tests

## Plan Summary

- **What/Why:** Add a small, self-contained greeting helper that produces a *formal* greeting (e.g. `"Good day, <name>."`), placed under a new `src/` directory, with accompanying tests. This is a [DISPOSABLE E2E TEST] plan exercising the local planning layout path.
- **Key decisions:** Greeting style = **Formal** (Q-A); location = **`src/`** (Q-B); include tests = **Yes** (Q-C). Tests follow the existing `tsx`-based script runner pattern used by `scripts/test-contact.ts` rather than introducing a new test framework.
- **Most important files:** new `src/greeting.ts` (the helper), new `src/greeting.test.ts` (the test), `package.json` (add a `test:greeting` script), `tsconfig.json` (extend `include` to cover `src/`).
- **Priority / complexity:** Low priority, low complexity — a single pure function plus a tiny test harness. No runtime dependencies, no network, no I/O.
- **Scope guard:** Do exactly this and nothing else — no refactors of existing `scripts/` code.

## Problem Statement

The repository currently exposes a "Contact Us" feature implemented as TypeScript files under `scripts/` (`scripts/contact.ts`, `scripts/test-contact.ts`), run via `tsx`. There is no general-purpose greeting utility and no `src/` directory.

This plan adds a minimal, pure **formal greeting helper** under a new `src/` directory, with a test, so the project gains a reusable greeting function. The work is intentionally narrow: produce the helper and its test, wire up the minimal config needed to type-check and run it, and nothing more.

#### Planning Context

**Key requirements**
- Provide a function that returns a *formal* greeting for a given name.
- Place the helper under `src/` (a new top-level directory).
- Include a test for the helper.

**Decisions made (with rationale)**
- **Greeting style = Formal** — per Q-A answer ("Formal"). The helper produces a courteous, formal phrasing (`"Good day, <name>."`) rather than casual ("Hi") or novelty ("pirate") styles.
- **Location = `src/`** — per Q-B answer ("src/"). This introduces a new top-level `src/` directory distinct from the existing `scripts/` directory.
- **Tests = Yes** — per Q-C answer. Tests reuse the project's existing lightweight pattern: a standalone `tsx`-executed script that asserts and exits non-zero on failure (mirroring `scripts/test-contact.ts:7`), avoiding a new test-framework dependency.
- **Test runner wiring** — add an npm script `test:greeting` alongside the existing `test:contact` script in `package.json:6` so the test is runnable the same way as the rest of the project.
- **tsconfig coverage** — `tsconfig.json` currently has `"include": ["scripts/**/*.ts"]` (`tsconfig.json`), which would exclude `src/`. Extend `include` to also cover `src/**/*.ts` so `npm run typecheck` validates the new files.

**Out of scope**
- Any change to the existing Contact Us feature (`scripts/contact.ts`, `scripts/test-contact.ts`).
- Casual/pirate greeting variants, localization, or configurable styles.
- Adding a test framework (Jest/Vitest), CI changes, or build-output changes.
- Opening a PR or committing (the planning pass only writes this plan).

## Detailed Requirements

**Functional**
- A function `formalGreeting(name: string): string` that returns a formal greeting incorporating the provided name, e.g. `formalGreeting("Ada")` → `"Good day, Ada."`.
- Input handling: trim surrounding whitespace from `name`; if the trimmed name is empty, fall back to a neutral formal greeting (`"Good day."`) rather than producing `"Good day, ."`.

**Technical**
- TypeScript, ES module syntax, matching the existing code style (named `export`, explicit return types) as seen in `scripts/contact.ts:20`.
- No external/runtime dependencies; pure function with no side effects.
- Must type-check under the existing strict `tsconfig.json` settings (`strict: true`).

**Non-Functional**
- Deterministic and synchronous (no async, no clock/network).
- Self-contained within `src/`; introduces no coupling to `scripts/`.

## Proposed Solution

Add a new `src/` directory containing a single pure helper module and a sibling test module. The helper exports `formalGreeting`. The test imports it and asserts expected outputs using the same assert-and-exit convention already used in `scripts/test-contact.ts`. Minimal config updates make the new directory type-checked and runnable.

```
src/
  greeting.ts        # export function formalGreeting(name): string
  greeting.test.ts   # tsx-run assertions, exit(1) on failure

package.json         # + "test:greeting": "tsx src/greeting.test.ts"
tsconfig.json        # include += "src/**/*.ts"
```

## Assumptions

Decisions taken to resolve open points without further questions (final round — no questions asked):

1. **Function name and signature:** `formalGreeting(name: string): string`. Chosen for clarity and to match the named-export, explicit-return-type style in `scripts/contact.ts:20`.
2. **Exact greeting text:** `"Good day, <name>."` for a non-empty name, and `"Good day."` when the name is empty/whitespace. "Good day" was selected as an unambiguously formal English greeting.
3. **Empty/whitespace name:** trimmed; empty → neutral formal fallback (`"Good day."`). No exception is thrown (the helper is non-throwing; greeting is best-effort).
4. **Test style:** standalone `tsx` script that logs `PASS`/`FAIL` and calls `process.exit(1)` on any failure and `process.exit(0)` at the end, mirroring `scripts/test-contact.ts:48`. No new test framework is added.
5. **Test filename:** `src/greeting.test.ts` (co-located with the helper).
6. **npm script name:** `test:greeting`, placed next to `test:contact` in `package.json`.
7. **File extension in imports:** use explicit `.ts` import specifiers (e.g. `./greeting.ts`), consistent with `scripts/test-contact.ts:1` and the tsconfig `allowImportingTsExtensions: true` setting.

<details><summary><b>Implementation Detail</b></summary>

## Implementation Steps

### Phase 1 — Create the helper
1. Create directory `src/`.
2. Create `src/greeting.ts` with a single named export:
   ```ts
   export function formalGreeting(name: string): string {
     const trimmed = name?.trim() ?? "";
     return trimmed ? `Good day, ${trimmed}.` : "Good day.";
   }
   ```
   - Follow the named-export + explicit-return-type style of `scripts/contact.ts:20` (`export function validateContact(input: ContactInput): void`).

### Phase 2 — Add the test
3. Create `src/greeting.test.ts` following the assert-and-exit pattern of `scripts/test-contact.ts` (see the `run()` structure at `scripts/test-contact.ts:7` and the terminal `process.exit(0)` at `scripts/test-contact.ts:48`):
   ```ts
   import { formalGreeting } from "./greeting.ts";

   function assert(cond: boolean, msg: string): void {
     if (!cond) {
       console.error(`FAIL: ${msg}`);
       process.exit(1);
     }
     console.log(`PASS: ${msg}`);
   }

   assert(formalGreeting("Ada") === "Good day, Ada.", "named greeting");
   assert(formalGreeting("  Ada  ") === "Good day, Ada.", "trims whitespace");
   assert(formalGreeting("") === "Good day.", "empty name fallback");
   assert(formalGreeting("   ") === "Good day.", "whitespace-only fallback");

   console.log("ALL PASS");
   process.exit(0);
   ```

### Phase 3 — Wire up config
4. In `package.json` (`scripts` block, currently at `package.json:5`), add:
   ```json
   "test:greeting": "tsx src/greeting.test.ts"
   ```
   Keep existing scripts (`contact`, `test:contact`, `typecheck`, `build`) unchanged.
5. In `tsconfig.json`, change `"include": ["scripts/**/*.ts"]` to `"include": ["scripts/**/*.ts", "src/**/*.ts"]` so the new files are type-checked by `npm run typecheck`.

## Edge Cases
- Empty string → `"Good day."` (no dangling comma).
- Whitespace-only string → `"Good day."` (after trim).
- Names with internal whitespace (e.g. `"Ada Lovelace"`) are preserved verbatim: `"Good day, Ada Lovelace."`.
- `null`/`undefined` passed despite the `string` type (defensive, matching the `?.trim() ?? ""` guard used in `scripts/contact.ts:22`) → `"Good day."`.

## Technical Considerations
- **Dependencies:** none added; `tsx`/`typescript` already present in `devDependencies` (`package.json`).
- **Config:** only the `tsconfig.json` `include` extension and the new `package.json` script.
- **Security:** pure string function, no I/O, no network, no secrets — no security surface.
- **Drift check:** Repo Snapshot commit for this plan is `5dd7a6423a0fff037432818912c7744a58c21fb1`. At this checkout there is no `src/` directory (verified) and `tsconfig.json` includes only `scripts/**/*.ts`; both are created/updated by this plan. No drift affecting the plan was observed.

## Testing Strategy
- **Unit:** `src/greeting.test.ts` asserts named greeting, whitespace trimming, and empty/whitespace fallbacks (see Phase 2).
- **Integration:** run `npm run test:greeting` — expect `ALL PASS` and exit code 0.
- **Typecheck:** run `npm run typecheck` — expect no errors with the extended `include`.
- **Manual:** `npx tsx -e 'import("./src/greeting.ts").then(m => console.log(m.formalGreeting("Ada")))'` → prints `Good day, Ada.`

## Documentation Updates
- Optional: a one-line mention in `README.md` that a `formalGreeting` helper exists under `src/`. Not required for this disposable test; include only if trivially consistent with existing README style.

## Acceptance Criteria
- [ ] `src/greeting.ts` exists and exports `formalGreeting(name: string): string`.
- [ ] `formalGreeting("Ada")` returns exactly `"Good day, Ada."`.
- [ ] `formalGreeting("")` and `formalGreeting("   ")` return exactly `"Good day."`.
- [ ] `src/greeting.test.ts` exists and, when run via `npm run test:greeting`, prints `ALL PASS` and exits 0.
- [ ] `package.json` contains a `test:greeting` script; all pre-existing scripts are unchanged.
- [ ] `tsconfig.json` `include` covers `src/**/*.ts`; `npm run typecheck` passes.
- [ ] No files under `scripts/` are modified.

## Dependencies & Related Work
- Reuses the existing `tsx` runner and test convention established by `scripts/test-contact.ts`.
- No blocking dependencies; can be implemented and verified in a single pass.

</details>
