# Add a standalone `greet(name)` greeting helper (`scripts/greet.ts`) with CLI, offline test and README entry

## Plan Summary

- **What/why:** Add a tiny, self-contained greeting helper. `greet(name)` returns `Hello, <name>!` (for example `Hello, Sam!`). If the name is empty, only spaces, or missing, it returns `Hello, there!`. The helper stays fully separate from the Contact Us → Slack feature.
- **Key decisions:** It lives in a new file, `scripts/greet.ts`, because only `scripts/**/*.ts` is type-checked (`tsconfig.json:14`). It is exposed two ways: as a named export you can import, and as the command `npm run greet -- <name>`, using the same direct-run guard as `scripts/contact.ts:115-118`. A new offline test, `scripts/test-greet.ts` (`npm run test:greet`), needs no `SLACK_URL`.
- **Files touched:** `scripts/greet.ts` (new), `scripts/test-greet.ts` (new), `package.json` (two new script lines), `README.md` (one short section appended at the end). Nothing else changes.
- **Priority/complexity:** Low priority, trivial complexity (about 40 new lines). No runtime dependencies and no network. Every end-to-end case below is a runnable shell `script` and was run against a scratch prototype at this commit: all 10 passed.

## Problem Statement

The repository `thabungm/testHubLaunch` has no greeting code: `rg -i 'greet|hello'` finds nothing outside `package-lock.json`. The request is to add a small function that takes a name and returns a greeting, and to decide where it lives and how it is exposed.

The repo is a tiny strict-ESM TypeScript project built around one feature, a headless "Contact Us" form that posts to Slack (`scripts/contact.ts`). Its contribution guidelines require:

- `npm run typecheck` (strict `tsc --noEmit`) must pass.
- `.ts` files run through `npm run` scripts using `tsx`, because the sandbox Node is v20.20.2 and cannot strip types.
- No runtime npm dependencies.
- Every feature ships with a runnable test script in `scripts/`.

#### Planning Context

**Key requirements (authoritative understanding):**

- A function `greet(name)` returns `Hello, <name>!`, e.g. `Hello, Sam!`.
- With an empty or missing name it returns the friendly default `Hello, there!`.
- It lives in its own small module, is exported for reuse, and is covered by a test.
- The README gets a short entry that describes it as a utility unrelated to Contact Us.

**Decisions made (with rationale):**

| Decision | Choice | Rationale |
|---|---|---|
| Proceed despite a weak link to the project goals | Build as requested, and keep the helper fully separate from Contact Us | The human chose "As requested". A separate file, separate npm scripts and a separate README section mean it cannot blur the Contact Us feature. |
| Greeting wording | `Hello, <name>!` | The human's answer. |
| Blank or missing name | Return `Hello, there!`; the command still exits 0 | The human chose a friendly default over an error. |
| Location | `scripts/greet.ts` | `tsconfig.json:14` is `"include": ["scripts/**/*.ts"]`. A file anywhere else would not be type-checked unless `tsconfig.json` changed, which is out of scope. |
| Exposure | Named export, plus the command `npm run greet -- <name>` | Same shape as the existing feature module: named exports plus a guarded `main()` (`scripts/contact.ts:89-118`). |
| Test | New offline `scripts/test-greet.ts`, run by `npm run test:greet` | `scripts/test-contact.ts:9-12` exits 1 when `SLACK_URL` is unset, so it cannot host an offline test. The repo has no test framework; tests are plain `tsx` scripts that print `PASS`/`FAIL`/`ALL PASS`. |

**Out of scope:**

- Localization or multiple languages, time-of-day greetings, an options object, CLI flag parsing.
- Any change to `scripts/contact.ts`, `scripts/test-contact.ts`, `scripts/build.mjs`, `tsconfig.json`, `.gitignore` or `ralph.md`.
- HTML/Slack escaping. The greeting is a plain string and is never sent to Slack.
- Dependency bumps, reformatting, or any other drive-by change.

**Departures from the request (repeat this sentence in the PR body):** The "unit test" is a standalone `tsx` script (`scripts/test-greet.ts`) because the repo has no test framework. The README entry is a small section (a heading, two sentences and a two-line code block) rather than a single line, so that it can name both commands and the function.

#### Assumptions

These points were decided without further questions, because this is the final planning round:

1. **Signature:** `export function greet(name?: string): string`. The parameter is optional so a missing name is handled. The function is pure and synchronous: no I/O, no environment variables, no network.
2. **Normalization:** the name is trimmed with the same idiom as `scripts/contact.ts:21` (`name?.trim() ?? ""`). Inner spacing and capitalization are kept exactly as given, so `greet("ada  LOVELACE")` returns `Hello, ada  LOVELACE!`.
3. **Fallback word:** a module-level constant `FALLBACK_NAME = "there"`, in the same module-level `SCREAMING_CASE` style as `EMAIL_RE` at `scripts/contact.ts:17`. Empty, whitespace-only, `undefined` and (at runtime) `null` names all produce `Hello, there!`.
4. **Command behavior:** the command joins `process.argv.slice(2)` with single spaces, so `npm run greet -- Ada Lovelace` greets "Ada Lovelace". It prints exactly one line to stdout and exits 0, including when no name is given. There is no flag parsing, so `--help` is treated as a name. Use `npm run --silent greet …` when stdout must be exactly the greeting, because npm otherwise prints its `> tsx …` header.
5. **No explicit `process.exit(0)` in `main()`.** The command has no failure path and Node exits 0 on its own. `contact.ts` calls `process.exit` only because it has asynchronous failure branches.
6. **Direct-run guard:** reuse the exact guard from `scripts/contact.ts:115-116` (`import.meta.url === \`file://${process.argv[1]}\``) so both modules behave the same way. Its known limitation (paths with spaces or URL-encoded characters) is shared with `contact.ts` and is not fixed here (see Risks).
7. **Test style:** a small table of `[label, input, expected]` rows and one loop, inside `function run(): void` that is called with `run();`. This mirrors `scripts/test-contact.ts:8` and `:51`. It differs slightly from `test-contact.ts`, which writes each check as its own block, because six identical-shape string checks read better as a table. The output format (`PASS (label): …`, `FAIL (label): …`, `ALL PASS`) and the 0/1 exit codes match `scripts/test-contact.ts:24-48` exactly.
8. **README:** one H2 section appended at the very end of `README.md`. It must contain the literal strings `## Greeting helper`, `npm run greet`, `npm run test:greet` and `greet(name`, because E2E case 8 greps for them. It must only add lines, so no existing line (including the last line) is edited.
9. **`package.json`:** exactly two lines are added and none are removed. E2E case 7 checks `git diff --numstat` = `2 0`, so do not reformat the file.
10. **`ralph.md` is unchanged.** Its regression command stays `npm run test:contact`. Adding `test:greet` there is a possible follow-up, not part of this change.
11. **Project goals:** the human agreed to save the inferred project goals. HubLaunch handles that outside the code; nothing in the repo changes for it.
12. **E2E cases:** the draft cases 1–8 keep their `item`, `expected` and `setup` text verbatim. Three things changed so the plan validator and harness accept them:
    - Prose `criterion` values became bare AC ids (`"AC1"` …).
    - Every case got a runnable POSIX-`sh` `script` (run from the repo root) and an `expectRegex`.
    - Drafts 3, 6, 7 and 8 moved from `sandbox-run` to `cli`. Each is a single shell command, and `sandbox-run` needs a HubLaunch `launchName` that does not apply here.

    Where a draft `expected` allows two outcomes (case 4), the script asserts the outcome the human chose (`Hello, there!`, exit 0). Cases 9 and 10 are new: they pin down whitespace-only and missing names, and the "import prints nothing" guarantee.
13. **Baseline / drift:** the planning snapshot was commit `5dd7a6423a0fff037432818912c7744a58c21fb1`. The current checkout is `3216d8e`, which only adds an earlier, rejected draft of this plan (`.hublaunch/plans/2026-11-16-08-56-add-greeting-helper.md`), so there is no source drift. **This file supersedes that draft; ignore the older file.** `node_modules` is absent from the workspace, so run `npm install` (devDependencies only) before any script. The full design (both new files, the two `package.json` lines and the README section) was prototyped in a scratch copy at this commit. There, `npm run typecheck`, `npm run test:greet` and all 10 E2E scripts passed. Case 7 also correctly failed when a dependency was added, when a devDependency version was changed, or when `scripts/contact.ts` was edited.

## Detailed Requirements

### Functional

1. `greet("Sam")` returns `"Hello, Sam!"`.
2. `greet("Ada Lovelace")` returns `"Hello, Ada Lovelace!"`.
3. `greet("  Ada  ")` returns `"Hello, Ada!"` (surrounding whitespace trimmed).
4. `greet("")`, `greet("   ")` and `greet()` each return `"Hello, there!"`.
5. `npm run --silent greet -- Sam` prints `Hello, Sam!` (one line) and exits 0.
6. `npm run --silent greet -- Ada Lovelace` prints `Hello, Ada Lovelace!` and exits 0.
7. `npm run --silent greet` (no name) and `npm run --silent greet -- "   "` print `Hello, there!` and exit 0, with nothing on stderr.
8. Importing `scripts/greet.ts` from another module prints nothing. The command runs only when the file is executed directly.

### Technical

- ESM, TypeScript strict. It must type-check under the existing `tsconfig.json` (`verbatimModuleSyntax`, `allowImportingTsExtensions`, `moduleResolution: Bundler`).
- Imports use a relative path with an explicit `.ts` extension (`"./greet.ts"`), as in `scripts/test-contact.ts:6`.
- New npm scripts follow the `<feature>` / `test:<feature>` → `tsx scripts/<file>.ts` naming at `package.json:6-7`.
- No `dependencies` block is added and `devDependencies` are unchanged.
- Use `function` declarations, not arrow-function constants, matching every function in `scripts/contact.ts`.

### Non-Functional

- Zero network access and zero environment variables; in particular `SLACK_URL` is never read.
- Small: about 15 lines for the module and about 25 for the test.
- Contact Us behavior, docs and regression tests are untouched.

## Proposed Solution

Add one new feature module next to `contact.ts`, with the same shape: a module-level constant, a named export, a private `main()`, then the direct-run guard. Add a sibling offline test script, register both in `package.json`, and append a short README section. The only edits to existing files are the two added `package.json` lines and the appended README section.

This is a single small module, so no diagram is needed.

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

- `main()` is synchronous, so it is called without `await`. In `scripts/contact.ts:117`, by contrast, `main` is `async` and awaited.
- Do **not** import anything from `contact.ts` and do not reuse `ContactValidationError`. The helper must stay standalone.

### Phase 2: Create the offline test (`scripts/test-greet.ts`, new)

Mirror `scripts/test-contact.ts`:

- `.ts`-extension import (line 6)
- a `run()` function (line 8) called at the bottom (line 51)
- `PASS (…)`/`FAIL (…)` lines, with `console.error` + `process.exit(1)` on failure (lines 24-27)
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

The test must not read `SLACK_URL` or touch the network. No `type` keyword is needed on the import, because `greet` is a value, not a type.

### Phase 3: Register npm scripts (`package.json`)

In the `scripts` block (`package.json:5-10`), add two entries directly after `"test:contact"` (line 7) and before `"typecheck"`, so the feature scripts stay grouped:

```json
"greet": "tsx scripts/greet.ts",
"test:greet": "tsx scripts/test-greet.ts",
```

Change nothing else: no new dependencies, no version edits, no reformatting. Keep the 2-space indentation and the trailing newline. `git diff --numstat` for `package.json` must read `2 0`.

### Phase 4: Document the helper (`README.md`)

Append one new section at the **end** of `README.md`, after the `## Notes` section (`README.md:81-85`). Leave one blank line before the heading. Match the bash-block-with-aligned-comments style at `README.md:62-66`:

````markdown

## Greeting helper (separate utility)

`scripts/greet.ts` is a tiny standalone helper, unrelated to the Contact Us
feature: `greet(name?)` returns `Hello, <name>!`, or `Hello, there!` when the
name is blank or missing. Run it with `npm run greet -- <name>`; add `--silent`
to print only the greeting line.

```bash
npm run --silent greet -- Sam   # prints: Hello, Sam!
npm run test:greet              # offline test — no SLACK_URL needed
```
````

Do not edit any existing README line, including the title `# Contact Us → Slack` and the last line of `## Notes`.

### Phase 5: Verify

From the repo root:

1. `npm install` (devDependencies only; `node_modules/` is gitignored, so do not commit it).
2. `npm run typecheck` → exits 0.
3. `env -u SLACK_URL npm run test:greet` → six `PASS` lines, then `ALL PASS`, exit 0.
4. Run each `script` in `## End-to-End Test Cases` with `sh -c '<script>'` from the repo root. Each must exit 0, and its output must match `expectRegex`.
5. `git diff --stat 5dd7a6423a0fff037432818912c7744a58c21fb1` lists only `README.md`, `package.json`, `scripts/greet.ts`, `scripts/test-greet.ts` and files under `.hublaunch/plans/`.

<details><summary><b>Implementation Detail</b></summary>

## Edge Cases

| Input | Function result | Command result |
|---|---|---|
| `"Sam"` | `Hello, Sam!` | `npm run --silent greet -- Sam` → `Hello, Sam!`, exit 0 |
| `"Ada Lovelace"` | `Hello, Ada Lovelace!` | `… greet -- Ada Lovelace` (two argv words joined) → same, exit 0 |
| `"  Ada  "` | `Hello, Ada!` | `… greet -- "  Ada  "` → `Hello, Ada!` |
| `""` / `"   "` / `undefined` | `Hello, there!` | `… greet` or `… greet -- "   "` → `Hello, there!`, exit 0 |
| `null` (JS caller, runtime only) | `Hello, there!` (`?.` short-circuits) | n/a |
| `"ada  LOVELACE"` | `Hello, ada  LOVELACE!` (inner spacing and case preserved) | quoted as one argument → same |
| `"--help"` | `Hello, --help!` (no flag parsing, by design) | `… greet -- --help` → `Hello, --help!` |
| `"<b>Sam</b>"` | `Hello, <b>Sam</b>!` (no escaping; never sent to Slack) | same |

Running the command without `--silent` adds npm's `> tsx scripts/greet.ts` header lines. That is normal npm behavior; the greeting line itself is unchanged.

## Technical Considerations

- **Dependencies:** none added. `tsx` and `typescript` are already devDependencies (`package.json:11-15`).
- **Config:** `tsconfig.json` is unchanged. Its `include` (`scripts/**/*.ts`) already covers both new files, and `scripts/build.mjs` (which always runs `tsc --noEmit`) needs no change.
- **Module system:** ESM (`"type": "module"`, `package.json:4`). The `.ts` import extension is allowed by `allowImportingTsExtensions` and is the repo's style.
- **Security:** the helper never reads environment variables, so `SLACK_URL` cannot leak. It does no network, file or process I/O beyond printing one line.
- **Runtime:** Node v20 cannot run `.ts` directly. Always go through the `npm run` scripts (`tsx`) or `npx tsx …`, as documented at `README.md:84-85`.

### Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| The direct-run guard (`file://${process.argv[1]}`) does not match when the repo path contains spaces or URL-encoded characters, so the command prints nothing | Low (the sandbox path is `/workspace`) | The limitation is shared with `scripts/contact.ts:116` and kept for consistency. If it ever matters, fix both modules together in a separate change, e.g. with `pathToFileURL(process.argv[1]).href` from `node:url`. |
| Someone later wires the helper into the Contact Us flow, blurring the project's purpose | Low | The README labels it a separate utility, and the module imports nothing from `contact.ts`. |
| `npm run greet` output includes npm header lines, which surprises scripted callers | Medium | The README and E2E cases use `npm run --silent greet …`. |
| E2E cases 7 and 8 diff against commit `5dd7a64…`, which a shallow clone may lack | Low | Run `git fetch --unshallow` (or fetch enough history) before those cases if `git cat-file -e 5dd7a6423a0fff037432818912c7744a58c21fb1` fails. |

## Testing Strategy

### Unit (offline)

`scripts/test-greet.ts` (Phase 2) covers a single name, a multi-word name, trimming, and empty, blank and missing names. It needs no environment variables and no network. Run it with `env -u SLACK_URL npm run test:greet`.

If the import-side guard were broken, `test-greet.ts` would also print a stray `Hello, there!` before its first `PASS` line. E2E case 10 checks the guard directly.

### Static

`npm run typecheck` (also run by `npm run build` via `scripts/build.mjs`) must stay clean. It is the project's configured check command (`ralph.md:22-24`).

### Regression

`npm run test:contact` (`ralph.md:29-31`) is unaffected, because neither of its files changes. It needs a real `SLACK_URL`, so it may be skipped in sandboxes without one. That skip is not a failure of this change.

### End-to-end

Use the `## End-to-End Test Cases` block below as the checklist; it is the single source of truth. Each case has a POSIX-`sh` `script` (tested under `dash`). Run the scripts from the repo root after `npm install`. A script exits non-zero when the exact expected output is not produced, and `expectRegex` matches the line it prints on success.

## Documentation Updates

- `README.md`: one new section, `## Greeting helper (separate utility)`, appended at the end (Phase 4). No other doc changes.
- `ralph.md` and other HubLaunch files are unchanged.

## Acceptance Criteria

- [ ] **AC1**: `npm run --silent greet -- <name…>` prints exactly one line, `Hello, <name>!`, to stdout and exits 0. Several words are joined with single spaces (`Ada Lovelace` → `Hello, Ada Lovelace!`).
- [ ] **AC2**: `scripts/greet.ts` exports a named function `greet(name?: string): string` that other modules can import. It trims surrounding whitespace from the name (`"  Ada  "` → `Hello, Ada!`). Importing the module prints nothing and does not run the command.
- [ ] **AC3**: A missing, empty or whitespace-only name produces the friendly default `Hello, there!`, from both the function and the command (exit 0, nothing on stderr). No error is raised.
- [ ] **AC4**: `scripts/test-greet.ts` exists and runs via `npm run test:greet` without `SLACK_URL` or any network call. It prints `PASS` lines and a final `ALL PASS`, and exits 0.
- [ ] **AC5**: `npm run typecheck` (strict `tsc --noEmit`) exits 0, and both new files are in the checked set (`scripts/**/*.ts`).
- [ ] **AC6**: No runtime dependency is added. `package.json` still has no `dependencies` block, `devDependencies` are unchanged, and the only change is the two new `greet` and `test:greet` script lines. `scripts/contact.ts`, `scripts/test-contact.ts`, `scripts/build.mjs` and `tsconfig.json` are byte-for-byte unchanged.
- [ ] **AC7**: `README.md` has a short greeting-helper section, separate from the Contact Us sections, that mentions `npm run greet`, `npm run test:greet` and the `greet` function. Existing README lines are unchanged (additions only).

#### Definition of Done

- All acceptance criteria are met, and every E2E `script` exits 0 with output matching its `expectRegex`.
- `npm run typecheck` and `npm run test:greet` pass.
- Only the four planned files change, plus files under `.hublaunch/plans/`.

## Dependencies & Related Work

- No upstream dependencies or blocking work.
- Related: the Contact Us feature (`scripts/contact.ts`, `scripts/test-contact.ts`). It is deliberately not modified.
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
      "script": "out=\"$(npm run --silent greet -- Sam)\" && printf '%s\\n' \"$out\" && test \"$out\" = \"Hello, Sam!\"",
      "expectRegex": "Hello, Sam!",
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
      "script": "out=\"$(npm run --silent greet -- Ada Lovelace)\" && printf '%s\\n' \"$out\" && test \"$out\" = \"Hello, Ada Lovelace!\"",
      "expectRegex": "Hello, Ada Lovelace!",
      "struck": false
    },
    {
      "index": 3,
      "item": "Import the function from another module and call it with a padded name: tsx -e \"import { greet } from './scripts/greet.ts'; console.log(greet('  Ada  '))\"",
      "driver": "cli",
      "expected": "prints the greeting for \"Ada\" with surrounding spaces removed (default \"Hello, Ada!\") and exits 0",
      "needsRealClaude": false,
      "criterion": "AC2",
      "setup": "npm install; run from the repo root",
      "script": "out=\"$(npx tsx -e \"import { greet } from './scripts/greet.ts'; console.log(greet('  Ada  '))\")\" && printf '%s\\n' \"$out\" && test \"$out\" = \"Hello, Ada!\"",
      "expectRegex": "Hello, Ada!",
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
      "script": "out=\"$(npm run --silent greet)\" && printf '%s\\n' \"$out\" && test \"$out\" = \"Hello, there!\"",
      "expectRegex": "Hello, there!",
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
      "script": "env -u SLACK_URL npm run test:greet",
      "expectRegex": "PASS \\([^)]+\\)[\\s\\S]*ALL PASS",
      "struck": false
    },
    {
      "index": 6,
      "item": "Strict type-check of the whole project: npm run typecheck",
      "driver": "cli",
      "expected": "tsc --noEmit exits 0 with no errors, and scripts/greet.ts and scripts/test-greet.ts are within the checked files",
      "needsRealClaude": false,
      "criterion": "AC5",
      "setup": "npm install",
      "script": "npm run typecheck && test \"$(npx tsc --noEmit --listFilesOnly | grep -cE 'scripts/(greet|test-greet)\\.ts$')\" = 2 && echo \"TYPECHECK OK: scripts/greet.ts and scripts/test-greet.ts are checked\"",
      "expectRegex": "TYPECHECK OK",
      "struck": false
    },
    {
      "index": 7,
      "item": "Confirm no runtime dependency was added and Contact Us is untouched: inspect package.json and git diff --stat 5dd7a6423a0fff037432818912c7744a58c21fb1 -- scripts/contact.ts scripts/test-contact.ts scripts/build.mjs tsconfig.json",
      "driver": "cli",
      "expected": "package.json still has no \"dependencies\" block and devDependencies are unchanged (only the greet and test:greet scripts are new); the git diff for the listed files is empty",
      "needsRealClaude": false,
      "criterion": "AC6",
      "setup": "run on the implementation branch",
      "script": "node -e \"const p=require('./package.json'),s=p.scripts;process.exit(p.dependencies||s.greet!=='tsx scripts/greet.ts'||s['test:greet']!=='tsx scripts/test-greet.ts'?1:0)\" && git diff --numstat 5dd7a6423a0fff037432818912c7744a58c21fb1 -- package.json | awk '{exit !($1==2 && $2==0)}' && git diff --exit-code --stat 5dd7a6423a0fff037432818912c7744a58c21fb1 -- scripts/contact.ts scripts/test-contact.ts scripts/build.mjs tsconfig.json && echo \"DEPS OK; CONTACT US UNCHANGED\"",
      "expectRegex": "DEPS OK; CONTACT US UNCHANGED",
      "struck": false
    },
    {
      "index": 8,
      "item": "README documents the helper: grep the README for the greeting section, the greet / test:greet commands, and the function name",
      "driver": "cli",
      "expected": "README.md contains a greeting-helper section that mentions npm run greet, npm run test:greet and the greet function, separate from the Contact Us sections",
      "needsRealClaude": false,
      "criterion": "AC7",
      "script": "grep -n '^## Greeting helper' README.md && grep -qF 'npm run greet' README.md && grep -qF 'npm run test:greet' README.md && grep -qF 'greet(name' README.md && git diff --numstat 5dd7a6423a0fff037432818912c7744a58c21fb1 -- README.md | awk '$2 != 0 {exit 1}' && echo \"README OK\"",
      "expectRegex": "README OK",
      "struck": false
    },
    {
      "index": 9,
      "item": "Call the imported function with a whitespace-only name and with no argument: npx tsx -e \"import { greet } from './scripts/greet.ts'; console.log(greet('   ')); console.log(greet())\"; then run the command with a blank argument: npm run --silent greet -- \"   \"",
      "driver": "cli",
      "expected": "the tsx call prints exactly two lines, both \"Hello, there!\", and exits 0; the command prints exactly \"Hello, there!\" and exits 0; nothing is written to stderr by either call",
      "needsRealClaude": false,
      "criterion": "AC3",
      "setup": "npm install; run from the repo root",
      "script": "out=\"$(npx tsx -e \"import { greet } from './scripts/greet.ts'; console.log(greet('   ')); console.log(greet())\" 2>&1)\" && printf '%s\\n' \"$out\" && test \"$out\" = \"$(printf 'Hello, there!\\nHello, there!')\" && out2=\"$(npm run --silent greet -- \"   \" 2>&1)\" && printf '%s\\n' \"$out2\" && test \"$out2\" = \"Hello, there!\"",
      "expectRegex": "Hello, there!",
      "struck": false
    },
    {
      "index": 10,
      "item": "Import the module for side effects only and confirm the command does not run on import: npx tsx -e \"import './scripts/greet.ts'\"",
      "driver": "cli",
      "expected": "the import itself produces no output at all (empty stdout and stderr) and exits 0, because the direct-run guard keeps main() from running when the module is imported; the script then prints the marker IMPORT SILENT",
      "needsRealClaude": false,
      "criterion": "AC2",
      "setup": "npm install; run from the repo root",
      "script": "out=\"$(npx tsx -e \"import './scripts/greet.ts'\" 2>&1)\" && test -z \"$out\" && echo \"IMPORT SILENT\"",
      "expectRegex": "IMPORT SILENT",
      "struck": false
    }
  ]
}
```
