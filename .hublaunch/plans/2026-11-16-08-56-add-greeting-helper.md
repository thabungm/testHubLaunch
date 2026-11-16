# Add a standalone `greet(name)` greeting helper (`scripts/greet.ts`) with CLI, offline test and README entry

## Plan Summary

- **What/why:** Add a tiny, self-contained greeting helper. `greet(name)` returns `Hello, <name>!` (for example `Hello, Sam!`). If the name is empty, only spaces, or missing, it returns `Hello, there!`. The helper is kept clearly separate from the Contact Us → Slack feature.
- **Key decisions:** It lives in a new file, `scripts/greet.ts`, because only `scripts/**/*.ts` is type-checked (`tsconfig.json:14`). It is exposed two ways: as a named export you can import, and as a command, `npm run greet -- <name>`, using the same direct-run guard as `scripts/contact.ts:115-118`. An offline test, `scripts/test-greet.ts` (`npm run test:greet`), needs no `SLACK_URL`.
- **Files touched:** `scripts/greet.ts` (new), `scripts/test-greet.ts` (new), `package.json` (two new scripts), `README.md` (one short section at the end). Nothing else changes.
- **Priority/complexity:** Low priority and trivial complexity, about 40 lines in total. No runtime dependencies and no network.

## Problem Statement

The repository `thabungm/testHubLaunch` has no greeting code. `rg -i 'greet|hello'` finds nothing outside `package-lock.json`. The request is to add a small function that takes a name and returns a greeting. The planner chooses where it lives and how it is exposed.

The repo is a tiny strict-ESM TypeScript project built around one feature, a headless "Contact Us" form that posts to Slack (`scripts/contact.ts`). Its contribution guidelines require:

- `npm run typecheck` (strict `tsc --noEmit`) must pass.
- `.ts` files run through `npm run` scripts using `tsx`, because the sandbox Node is v20.20.2 and cannot strip types.
- No runtime npm dependencies.
- Every feature ships with a runnable test script in `scripts/`.

#### Planning Context

**Key requirements (authoritative understanding):**

- A function `greet(name)` returns `Hello, <name>!`, e.g. `Hello, Sam!`.
- With an empty or missing name it returns the friendly default `Hello, there!`.
- It lives in its own small module, is exported for reuse, and is covered by a unit test.
- The README gets a short entry that describes it as a utility unrelated to Contact Us.

**Decisions made (with rationale):**

| Decision | Choice | Rationale |
|---|---|---|
| Proceed despite a weak link to the project goals | Build as requested, and keep the helper fully separate from Contact Us | The human chose "As requested". Keeping it in its own file, with its own scripts and README section, means it cannot blur the Contact Us feature. |
| Greeting wording | `Hello, <name>!` | Human's answer (Q2 = A). |
| Blank or missing name | Return `Hello, there!`. The command still exits 0 | Human's answer (Q3 = A): a friendly default instead of an error. |
| Location | `scripts/greet.ts` | `tsconfig.json:14` has `"include": ["scripts/**/*.ts"]`. A file anywhere else would not be type-checked without editing `tsconfig.json`, which is out of scope. |
| Exposure | Named export, plus the command `npm run greet -- <name>` | Same pattern as the existing feature module: named exports plus a guarded `main()` (`scripts/contact.ts:89-118`). |
| Test | New offline `scripts/test-greet.ts` run by `npm run test:greet` | `scripts/test-contact.ts:9-12` exits 1 when `SLACK_URL` is unset, so it cannot host an offline test. The repo has no test framework, so plain `tsx` scripts print `PASS`/`FAIL`/`ALL PASS`. |

**Out of scope:**

- Localization or multiple languages, time-of-day greetings, an options object, CLI flag parsing.
- Any change to the Contact Us code (`scripts/contact.ts`, `scripts/test-contact.ts`), `scripts/build.mjs`, `tsconfig.json`, `.gitignore` or `ralph.md`.
- HTML/Slack escaping. The greeting is a plain string and is never sent to Slack.
- Dependency bumps, reformatting or other drive-by changes.

### Assumptions

These decisions were made without further questions, because this is the final planning round:

1. **Signature:** `export function greet(name?: string): string`. The parameter is optional so that a missing name is handled as the understanding requires. The function is pure and synchronous: no I/O, no env vars, no network.
2. **Normalization:** the name is trimmed with the same idiom as `scripts/contact.ts:21` (`name?.trim() ?? ""`). Inner spacing and capitalization are kept exactly as given, so `greet("ada  LOVELACE")` returns `Hello, ada  LOVELACE!`.
3. **Fallback word:** a module-level constant `FALLBACK_NAME = "there"`. This follows the module-level constant style of `EMAIL_RE` at `scripts/contact.ts:17`. Empty, whitespace-only, `undefined` and (at runtime) `null` names all produce `Hello, there!`.
4. **Command behavior:** the command joins `process.argv.slice(2)` with single spaces, so `npm run greet -- Ada Lovelace` greets "Ada Lovelace". It prints exactly one line to stdout and exits 0, including when no name is given. There is no flag parsing, so `--help` is treated as a name. Use `npm run --silent greet …` when you need stdout to be exactly the greeting, because npm otherwise prints its `> tsx …` header.
5. **No explicit `process.exit(0)` in `main()`.** The command has no failure path and Node exits 0 on its own. `contact.ts` calls `process.exit` because it has asynchronous failure branches; `greet.ts` has none.
6. **Direct-run guard:** reuse the exact guard from `scripts/contact.ts:116`, `import.meta.url === \`file://${process.argv[1]}\``, so the two modules stay consistent. Its known limitation (paths with spaces or URL-encoded characters) is shared with `contact.ts` and is not fixed here (see Risks).
7. **Test style:** the test uses a small table of `[label, input, expected]` rows and one loop, wrapped in `function run(): void` and called with `run();` to mirror `scripts/test-contact.ts:8` and `:51`. It differs slightly from `test-contact.ts`, which writes each check as its own block, because six near-identical string assertions read better as a table. The `PASS (label): …` / `FAIL (label): …` / `ALL PASS` output and the 0/1 exit codes match `scripts/test-contact.ts:24-48` exactly.
8. **README:** the understanding asks for "one short line" and E2E case 8 asks for a section that names the commands and the function. Both are met by one small H2 section at the very end of `README.md`. It has a one-sentence description labeled as unrelated to Contact Us, plus a two-line bash block. Existing Contact Us sections are not edited.
9. **`ralph.md` is unchanged.** Its regression command stays `npm run test:contact`. The implementation's own verification runs `npm run test:greet` explicitly. Adding `test:greet` to the regression list is a possible follow-up, not part of this change.
10. **Project goals:** the human answered "Yes" to saving the inferred project goals (Q4). That is handled by HubLaunch, not by this code change, and nothing in the repo is modified for it.
11. **E2E case `criterion` values** from the draft were normalized from prose (`"AC1: the helper is …"`) to bare AC ids (`"AC1"`), as the plan contract requires. Each case's `item`, `expected` and `setup` text is kept verbatim. Cases 9 and 10 were added. Because the human chose the friendly default for blank names, the only correct outcome for draft case 4 is stdout `Hello, there!` with exit 0. Case 9 pins that down for whitespace-only names.
12. **Baseline / drift:** the current checkout is at commit `5dd7a6423a0fff037432818912c7744a58c21fb1`, the same as the planning snapshot, so there is no drift. `node_modules` is not present in the workspace, so the implementation run must `npm install` (devDependencies only) before running any script. The whole design (both new files plus the two `package.json` scripts) was prototyped in a scratch copy of the repo at this commit. There, `npm run typecheck`, every draft E2E command and `npm run test:greet` passed.

## Detailed Requirements

### Functional

1. `greet("Sam")` returns `"Hello, Sam!"`.
2. `greet("Ada Lovelace")` returns `"Hello, Ada Lovelace!"`.
3. `greet("  Ada  ")` returns `"Hello, Ada!"`, because surrounding whitespace is trimmed.
4. `greet("")`, `greet("   ")` and `greet()` each return `"Hello, there!"`.
5. `npm run --silent greet -- Sam` prints `Hello, Sam!` (one line) and exits 0.
6. `npm run --silent greet -- Ada Lovelace` prints `Hello, Ada Lovelace!` and exits 0.
7. `npm run --silent greet` (no name) prints `Hello, there!` and exits 0.
8. Importing `scripts/greet.ts` from another module prints nothing. The command only runs when the file is executed directly.

### Technical

- ESM, TypeScript strict. It must type-check under the existing `tsconfig.json` (`verbatimModuleSyntax`, `allowImportingTsExtensions`, `moduleResolution: Bundler`).
- Imports use a relative path with an explicit `.ts` extension (`"./greet.ts"`), as in `scripts/test-contact.ts:6`.
- New npm scripts follow the `<feature>` / `test:<feature>` → `tsx scripts/<file>.ts` naming at `package.json:6-7`.
- No `dependencies` block is added and `devDependencies` are unchanged.

### Non-Functional

- Zero network access and zero environment variables. In particular, `SLACK_URL` is never read.
- The helper is small: about 15 lines for the module and about 25 for the test.
- Contact Us behavior, docs and regression tests are untouched.

## Proposed Solution

Add one new feature module next to `contact.ts`, with the same shape: named export(s), then a private `main()`, then the direct-run guard. Add a sibling offline test script, register both in `package.json`, and add a short README section at the end. No existing source file changes except the two additive lines in `package.json`, and the README gets an appended section.

The change is a single small module, so no diagram is needed.

## Implementation Steps

### Phase 1: Create the helper module (`scripts/greet.ts`, new)

Follow the module layout of `scripts/contact.ts`:

- module-level constant (`scripts/contact.ts:17`)
- exported function (`scripts/contact.ts:19-33`)
- private `main()` (`scripts/contact.ts:89`)
- direct-run guard with its comment (`scripts/contact.ts:115-118`)

```ts
const FALLBACK_NAME = "there";

export function greet(name?: string): string {
  const trimmed = name?.trim() ?? "";
  return `Hello, ${trimmed || FALLBACK_NAME}!`;
}

function main(): void {
  console.log(greet(process.argv.slice(2).join(" ")));
}

// Run main only when executed directly, not when imported by the test.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
```

Notes:

- `main()` is synchronous, so it is called without `await`. Contrast with `scripts/contact.ts:117`, where `main` is `async`.
- Do **not** import anything from `contact.ts`, and do not reuse `ContactValidationError`. The helper must stay standalone.

### Phase 2: Create the offline test (`scripts/test-greet.ts`, new)

Mirror `scripts/test-contact.ts`:

- `.ts`-extension import (line 6)
- a `run()` function (line 8) invoked at the bottom (line 51)
- `PASS (…)`/`FAIL (…)` lines, `console.error` + `process.exit(1)` on failure (lines 24-27)
- `ALL PASS` + `process.exit(0)` (lines 47-48)

```ts
import { greet } from "./greet.ts";

function run(): void {
  const cases: Array<[label: string, input: string | undefined, expected: string]> = [
    ["single name", "Sam", "Hello, Sam!"],
    ["multi-word name", "Ada Lovelace", "Hello, Ada Lovelace!"],
    ["trims surrounding whitespace", "  Ada  ", "Hello, Ada!"],
    ["empty name falls back", "", "Hello, there!"],
    ["blank name falls back", "   ", "Hello, there!"],
    ["missing name falls back", undefined, "Hello, there!"],
  ];

  for (const [label, input, expected] of cases) {
    const actual = greet(input);
    if (actual !== expected) {
      console.error(`FAIL (${label}): expected "${expected}", got "${actual}"`);
      process.exit(1);
    }
    console.log(`PASS (${label}): ${actual}`);
  }

  console.log("ALL PASS");
  process.exit(0);
}

run();
```

The test must not read `SLACK_URL` or touch the network.

### Phase 3: Register npm scripts (`package.json`)

In the `scripts` block (`package.json:5-10`), add two entries directly after `"test:contact"` (line 7) and before `"typecheck"`. This keeps feature scripts grouped:

```json
"greet": "tsx scripts/greet.ts",
"test:greet": "tsx scripts/test-greet.ts",
```

Change nothing else in `package.json`: no new dependencies and no version edits. Keep the 2-space indentation and the trailing newline.

### Phase 4: Document the helper (`README.md`)

Append one new section at the **end** of `README.md`, after the `## Notes` section (`README.md:81-85`). Match the existing bash-block-with-aligned-comments style at `README.md:62-66`:

````markdown

## Greeting helper (separate utility)

`scripts/greet.ts` is a tiny standalone helper, unrelated to the Contact Us
feature: `greet(name?)` returns `Hello, <name>!`, or `Hello, there!` when the
name is blank or missing.

```bash
npm run --silent greet -- Sam   # prints: Hello, Sam!
npm run test:greet              # offline test — no SLACK_URL needed
```
````

Do not edit any existing README section, including the title `# Contact Us → Slack`.

### Phase 5: Verify

From the repo root:

1. `npm install` (devDependencies only. `node_modules` is gitignored, so do not commit it.)
2. `npm run typecheck` → exits 0.
3. `env -u SLACK_URL npm run test:greet` → six `PASS` lines, `ALL PASS`, exit 0.
4. Run every command in `## End-to-End Test Cases` and compare with `expected`.
5. `git diff --stat 5dd7a6423a0fff037432818912c7744a58c21fb1` lists only `README.md`, `package.json`, `scripts/greet.ts`, `scripts/test-greet.ts` and this plan file.

## Acceptance Criteria

- **AC1:** `npm run --silent greet -- <name…>` prints exactly one line, `Hello, <name>!`, to stdout and exits 0. Several words are joined with single spaces (`Ada Lovelace` → `Hello, Ada Lovelace!`).
- **AC2:** `scripts/greet.ts` exports a named function `greet(name?: string): string` that other modules can import. It trims surrounding whitespace from the name (`"  Ada  "` → `Hello, Ada!`). Importing the module prints nothing and does not run the command.
- **AC3:** A missing, empty or whitespace-only name produces the friendly default `Hello, there!`, both from the function and from the command (exit 0). No error is raised.
- **AC4:** `scripts/test-greet.ts` exists and runs via `npm run test:greet` without `SLACK_URL` or any network call. It prints `PASS` lines and a final `ALL PASS`, and exits 0.
- **AC5:** `npm run typecheck` (strict `tsc --noEmit`) exits 0, and both new files are within the checked set (`scripts/**/*.ts`).
- **AC6:** No runtime dependency is added: `package.json` still has no `dependencies` block and `devDependencies` are unchanged. The only `package.json` change is the new `greet` and `test:greet` scripts. `scripts/contact.ts`, `scripts/test-contact.ts`, `scripts/build.mjs` and `tsconfig.json` are byte-for-byte unchanged.
- **AC7:** `README.md` has a short greeting-helper section, separate from the Contact Us sections, that mentions `npm run greet`, `npm run test:greet` and the `greet` function. Existing README sections are unchanged.

<details><summary><b>Implementation Detail</b></summary>

## Edge Cases

| Input | Function result | Command result |
|---|---|---|
| `"Sam"` | `Hello, Sam!` | `npm run --silent greet -- Sam` → `Hello, Sam!`, exit 0 |
| `"Ada Lovelace"` | `Hello, Ada Lovelace!` | `… greet -- Ada Lovelace` (two argv words joined) → same, exit 0 |
| `"  Ada  "` | `Hello, Ada!` | `… greet -- "  Ada  "` → `Hello, Ada!` |
| `""` / `"   "` / `undefined` | `Hello, there!` | `… greet` or `… greet -- "   "` → `Hello, there!`, exit 0 |
| `null` (JS caller, runtime only) | `Hello, there!` (`?.` short-circuits) | n/a |
| `"ada  LOVELACE"` | `Hello, ada  LOVELACE!` (inner spacing/case preserved) | quoted as one arg → same |
| `"--help"` | `Hello, --help!` (no flag parsing, by design) | `… greet -- --help` → `Hello, --help!` |
| `"<b>Sam</b>"` | `Hello, <b>Sam</b>!` (no escaping; never sent to Slack) | same |

Running the command without `--silent` adds npm's `> tsx scripts/greet.ts` header lines. That is expected npm behavior. The greeting line itself is unchanged.

## Testing Strategy

### Unit (offline)

`scripts/test-greet.ts` (Phase 2) covers single name, multi-word name, trimming, and empty, blank and missing names. It needs no env vars and no network. Run it with `env -u SLACK_URL npm run test:greet`.

The import-side guard (AC2: importing prints nothing) is also checked indirectly. If the guard were broken, `test-greet.ts` would print a stray `Hello, there!` line before the first `PASS` line.

### Static

`npm run typecheck` (also run by `npm run build` via `scripts/build.mjs`) must stay clean. This is the project's configured check command (`ralph.md:22-24`).

### Regression

`npm run test:contact` (`ralph.md:29-31`) is unaffected, because neither of its files is touched. It needs a real `SLACK_URL`, so it may be skipped in sandboxes without one. That skip is not a failure of this change.

### End-to-end / manual

Use the `## End-to-End Test Cases` block below as the checklist (single source of truth).

## Technical Considerations

- **Dependencies:** none added. `tsx` and `typescript` are already devDependencies (`package.json:11-15`).
- **Config:** `tsconfig.json` is unchanged. Its `include` (`scripts/**/*.ts`) already covers the new files, and `scripts/build.mjs` needs no change.
- **Module system:** ESM (`"type": "module"`, `package.json:4`). The `.ts` import extension is permitted by `allowImportingTsExtensions` and required by the repo's style. No `type` keyword is needed in the test import because `greet` is a value, not a type (`verbatimModuleSyntax`).
- **Security:** the helper never reads env vars, so `SLACK_URL` cannot leak. There is no network, file or process I/O beyond printing one line.
- **Runtime:** Node v20 cannot run `.ts` directly. Always go through the `npm run` scripts (`tsx`) or `npx tsx …`, as documented at `README.md:84-85`.

## Documentation Updates

- `README.md`: one new section, `## Greeting helper (separate utility)`, appended at the end (Phase 4). No other doc changes.
- `ralph.md` and other HubLaunch files are unchanged.

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| The direct-run guard (`file://${process.argv[1]}`) fails to match when the repo path contains spaces or URL-encoded characters, so the command prints nothing | Low (sandbox path is `/workspace`) | This limitation is shared with `scripts/contact.ts:116` and is kept for consistency. If it ever matters, fix both modules together in a separate change, e.g. with `pathToFileURL(process.argv[1]).href` from `node:url`. |
| Someone extends the helper into the Contact Us flow, blurring the project's purpose | Low | The README labels it a separate utility, and the module imports nothing from `contact.ts`. |
| `npm run greet` output includes npm header lines, which surprises scripted callers | Medium | Document `npm run --silent greet …` in the README and E2E cases. |

## Dependencies & Related Work

- No upstream dependencies or blocking work.
- Related: Contact Us feature (`scripts/contact.ts`, `scripts/test-contact.ts`). It is deliberately not modified.
- Possible follow-up (not in scope): add `npm run test:greet` to the `RALPH_REGRESSION_COMMANDS` block in `ralph.md:29-31`, so HubLaunch regression runs include an offline test that does not need `SLACK_URL`.

</details>

## End-to-End Test Cases

```json
{
  "version": 1,
  "cases": [
    {
      "index": 1,
      "item": "Run the greeting command with a single name: npm run --silent greet -- Sam",
      "driver": "cli",
      "expected": "stdout is exactly one line with the chosen greeting for Sam (default \"Hello, Sam!\") and the process exits 0",
      "needsRealClaude": false,
      "criterion": "AC1",
      "setup": "npm install",
      "struck": false
    },
    {
      "index": 2,
      "item": "Run the greeting command with a multi-word name: npm run --silent greet -- Ada Lovelace",
      "driver": "cli",
      "expected": "stdout is the greeting for \"Ada Lovelace\" (default \"Hello, Ada Lovelace!\") and the process exits 0",
      "needsRealClaude": false,
      "criterion": "AC1",
      "setup": "npm install",
      "struck": false
    },
    {
      "index": 3,
      "item": "Import the function from another module and call it with a padded name: tsx -e \"import { greet } from './scripts/greet.ts'; console.log(greet('  Ada  '))\"",
      "driver": "sandbox-run",
      "expected": "prints the greeting for \"Ada\" with surrounding spaces removed (default \"Hello, Ada!\") and exits 0",
      "needsRealClaude": false,
      "criterion": "AC2",
      "setup": "npm install; run from the repo root",
      "struck": false
    },
    {
      "index": 4,
      "item": "Run the greeting command with no name: npm run --silent greet",
      "driver": "cli",
      "expected": "matches the blank-name answer to question 3: either prints the friendly default (\"Hello, there!\") and exits 0, or prints a 'name is required' error to stderr and exits non-zero",
      "needsRealClaude": false,
      "criterion": "AC3",
      "setup": "npm install",
      "struck": false
    },
    {
      "index": 5,
      "item": "Run the offline greeting test with no Slack webhook configured: env -u SLACK_URL npm run test:greet",
      "driver": "cli",
      "expected": "output contains PASS lines and a final \"ALL PASS\"; the process exits 0 without any network call",
      "needsRealClaude": false,
      "criterion": "AC4",
      "setup": "npm install",
      "struck": false
    },
    {
      "index": 6,
      "item": "Strict type-check of the whole project: npm run typecheck",
      "driver": "sandbox-run",
      "expected": "tsc --noEmit exits 0 with no errors, and scripts/greet.ts and scripts/test-greet.ts are within the checked files",
      "needsRealClaude": false,
      "criterion": "AC5",
      "setup": "npm install",
      "struck": false
    },
    {
      "index": 7,
      "item": "Confirm no runtime dependency was added and Contact Us is untouched: inspect package.json and git diff --stat 5dd7a6423a0fff037432818912c7744a58c21fb1 -- scripts/contact.ts scripts/test-contact.ts scripts/build.mjs tsconfig.json",
      "driver": "sandbox-run",
      "expected": "package.json still has no \"dependencies\" block and devDependencies are unchanged (only the greet and test:greet scripts are new); the git diff for the listed files is empty",
      "needsRealClaude": false,
      "criterion": "AC6",
      "setup": "run on the implementation branch",
      "struck": false
    },
    {
      "index": 8,
      "item": "README documents the helper: grep the README for the greeting section, the greet / test:greet commands, and the function name",
      "driver": "sandbox-run",
      "expected": "README.md contains a greeting-helper section that mentions npm run greet, npm run test:greet and the greet function, separate from the Contact Us sections",
      "needsRealClaude": false,
      "criterion": "AC7",
      "struck": false
    },
    {
      "index": 9,
      "item": "Call the imported function with a whitespace-only name and with no argument: npx tsx -e \"import { greet } from './scripts/greet.ts'; console.log(greet('   ')); console.log(greet())\"; then run the command with a blank argument: npm run --silent greet -- \"   \"",
      "driver": "sandbox-run",
      "expected": "the tsx call prints exactly two lines, both \"Hello, there!\", and exits 0; the command prints exactly \"Hello, there!\" and exits 0; nothing is written to stderr",
      "needsRealClaude": false,
      "criterion": "AC3",
      "setup": "npm install; run from the repo root",
      "struck": false
    },
    {
      "index": 10,
      "item": "Import the module for side effects only and confirm the command does not run on import: npx tsx -e \"import './scripts/greet.ts'\"",
      "driver": "sandbox-run",
      "expected": "stdout is empty and the process exits 0 (the direct-run guard prevents main() from running when the module is imported)",
      "needsRealClaude": false,
      "criterion": "AC2",
      "setup": "npm install; run from the repo root",
      "struck": false
    }
  ]
}
```
