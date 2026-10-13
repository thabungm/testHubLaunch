# Add a Headless Product-Listing Module + CLI for the E-commerce Demo

## Plan Summary

- **What / why:** Add a read-only product-listing feature as a headless TypeScript module + CLI (`scripts/products.ts`) that loads products from a committed `scripts/products.json`, lists them to the console, and supports search/filter/sort flags plus an optional `--html` static-catalog export. This gives the e-commerce demo a product catalog without any HTTP server, web framework, or new runtime dependencies.
- **Key decisions:** Mirror the existing `scripts/contact.ts` conventions (collect-all validation error class, `esc()` HTML escaping, direct-execution guard, `main()` → `process.exit`). Data is loaded via `fs` + `JSON.parse` resolved relative to the module file using `import.meta.url` (not cwd). Prices are integer minor units; display is a fixed 2-decimal major-unit format + currency code (`12.99 USD`). Independent of Slack; `SLACK_URL` is unused.
- **Most important files:** `scripts/products.ts` (new module+CLI), `scripts/products.json` (new seed data), `scripts/test-products.ts` (new offline test), plus edits to `package.json` and `README.md`. Pattern source is `scripts/contact.ts`.
- **Priority / complexity:** Medium priority, medium complexity. All logic is self-contained, synchronous, and offline; the main care points are argument parsing (fail-fast on unknown flags/invalid values) and deterministic sort/tie-breaking.

## Problem Statement

The repository is an e-commerce demo that currently ships only a Slack-backed "Contact Us" feature (`scripts/contact.ts`). There is no way to represent or list a product catalog. We need a product listing: a way to load a set of products from committed data and display, search, filter, and sort them from the command line, with an optional static HTML catalog export — all without standing up a server or adding runtime dependencies.

The feature must fit the existing codebase conventions so it reads like the rest of the code: a `tsx`-run TypeScript module under `scripts/`, a framework-free companion test, strict type-checking, ESM with explicit `.ts` import extensions, and the same validation/escaping/CLI idioms already established by the contact module.

#### Planning Context

**Key requirements (confirmed, treat as decided):**

- **Output shape:** A headless TypeScript module + CLI at `scripts/products.ts`, mirroring `scripts/contact.ts`, that lists products to the console. A companion typed test at `scripts/test-products.ts`. An optional `--html` flag writes a self-contained static catalog HTML page. **No HTTP server, no web framework, no new runtime npm dependencies.**
- **Data source:** A committed `scripts/products.json`, loaded at runtime via `fs` + `JSON.parse`, resolved **relative to the module file** (`import.meta.url`), not the cwd. A `loadProducts(path?)` function accepts an optional override path.
- **Product schema (minimal):** `id` (string, non-empty, unique), `name` (string, non-empty), `price` (integer ≥ 0, minor units — e.g. `1299` = 12.99), `currency` (exactly 3 uppercase A–Z letters, "ISO 4217 format").
- **Read-only:** list / filter / sort / display only. No create, update, or delete.
- **Slack-independent:** `SLACK_URL` is not used anywhere in this feature.
- **CLI flags:**
  - `--sort name|price` and `--order asc|desc` (default `name asc`).
  - `--search <substring>`: case-insensitive match on `name`.
  - `--min-price <n>` / `--max-price <n>`: given in **major-unit decimals**, converted to minor units with `Math.round(n * 100)`, then compared against each product's raw minor-unit `price` **regardless of currency**. Bounds are inclusive.
  - Filters **AND** together. Empty result prints `No products match.` and exits `0`.
  - `--html` with no value writes `./products.html` in cwd; `--html <path>` overrides. The page is self-contained (inline CSS, no external assets, HTML-escaped values) and contains the same filtered/sorted rows. Prints `Wrote N products to <path>`.
- **Price display:** 2-decimal major units + currency code, e.g. `12.99 USD`. Fixed 2-decimal exponent for all currencies.
- **Validation (fail fast):** `validateProducts()` collects **every** issue (root not an array; missing/wrong-typed field; empty `id`/`name`; duplicate `id`; non-integer or negative `price`; malformed `currency`) and throws **one** `ProductValidationError` (extends `Error`, has `issues: string[]`). `main()` prints the issues and exits `1`. Mirrors `ContactValidationError`.
- **Error handling:** Unknown flags or invalid flag values print usage + an error message and exit `1`.
- **Wiring:** `package.json` gains `"products": "tsx scripts/products.ts"` and `"test:products": "tsx scripts/test-products.ts"`. `README.md` documents usage, flags, and the JSON schema.

**Decisions made (with rationale):**

- **Mirror `scripts/contact.ts` precisely** — the request explicitly names it as the template, and reusing its `ContactValidationError`/`validateContact()`/`esc()`/direct-execution-guard shapes keeps the new code idiomatic and reviewable (`scripts/contact.ts:8`, `:19`, `:36`, `:116`).
- **Resolve JSON relative to the module via `new URL("./products.json", import.meta.url)`** — required, and consistent with `"type": "module"` so the data loads the same regardless of cwd.
- **Sort tie-breaking is deterministic:** when sorting by `price` and two products tie, break by `name` ascending, then by `id` ascending. Name comparison is case-insensitive to match the case-insensitive `--search`. Rationale: the request does not specify tie-breaks, and deterministic output keeps the test and HTML export stable.
- **Price formatting:** `(price / 100).toFixed(2) + " " + currency`, a fixed 2-decimal exponent for all currencies (JPY etc. render with two decimals — explicitly out of scope).
- **`--min-price`/`--max-price` bounds are inclusive**; non-numeric or negative values are treated as invalid flag values (usage + error, exit `1`).
- **Currency validation** accepts exactly `/^[A-Z]{3}$/`; it does not check against the real ISO 4217 registry.
- **The test must be fully offline** — unlike `scripts/test-contact.ts` (which is a live Slack test requiring `SLACK_URL`), `scripts/test-products.ts` must not touch the network or depend on any env var.
- **Seed data** (`scripts/products.json`) holds a small set of realistic, valid products with mixed currencies (e.g. USD/EUR) to exercise the cross-currency price comparison and produce meaningful output out of the box.

**Out of scope:** CRUD (create/update/delete), Slack posting, pagination, images, categories, descriptions, SKU, stock levels, per-currency minor-unit exponents (JPY etc.), external/remote data sources, and any HTTP server or web framework.

## Detailed Requirements

### Functional

1. `loadProducts(path?: string): Product[]` — read JSON from `path` (default: `products.json` resolved relative to the module file), parse it, validate it, and return the typed array. Throws `ProductValidationError` on any validation failure; throws a plain `Error` with a clear message if the file is missing or the JSON is syntactically invalid.
2. `validateProducts(data: unknown): asserts data is Product[]` (or returns `Product[]`) — collect **all** issues across the whole array, then throw a single `ProductValidationError` if any exist.
3. Filtering: `--search` (case-insensitive substring on `name`), `--min-price`, `--max-price` (inclusive, compared on raw minor units). Filters AND together.
4. Sorting: `--sort name|price` with `--order asc|desc`; default `name asc`; deterministic tie-breaks as above.
5. Console listing: one human-readable line per product showing `id`, `name`, and formatted price (`12.99 USD`). Empty result prints `No products match.` and exits `0`.
6. HTML export: `--html [path]` writes a self-contained static catalog page containing the same filtered/sorted rows, HTML-escaping all values, and prints `Wrote N products to <path>` where `N` is the number of rows written.
7. CLI error handling: unknown flags or invalid flag values print a usage string + error to `stderr` and exit `1`.

### Technical

- TypeScript, ESM (`"type": "module"`). Use explicit `.ts` extensions on relative imports and `import type { ... }` for type-only symbols (required by `verbatimModuleSyntax: true` + `allowImportingTsExtensions: true` in `tsconfig.json`).
- Node built-ins only: `node:fs` (`readFileSync`) and `node:url` (`fileURLToPath` / `URL`). No runtime npm dependencies.
- Must pass strict `tsc --noEmit` (the `build` script runs it via `scripts/build.mjs`).
- Run via `tsx` (`npm run products`) — Node v20 cannot execute `.ts` directly.
- Reuse the direct-execution guard so importing the module from the test does not run `main()`.

### Non-Functional

- Fully offline and deterministic — no network, no env dependency, no clock- or random-dependent output.
- Clear, actionable error messages (validation lists every issue; CLI errors show usage).
- Generated `./products.html` is treated as a build artifact (not committed); `.gitignore` is left unchanged (flagged for human veto).

## Proposed Solution

Implement a single self-contained module `scripts/products.ts` exporting the data model, validation, loading, filtering/sorting, formatting, and HTML-rendering functions, with a `main()` that parses `process.argv`, applies filters/sort, and either prints the listing or writes the HTML catalog. A committed `scripts/products.json` provides seed data. A framework-free `scripts/test-products.ts` imports the pure functions and asserts their behavior offline. `package.json` and `README.md` are updated to wire and document the feature.

```
                    scripts/products.json  (committed seed data)
                              │
                     loadProducts(path?)  ──► validateProducts() ──► ProductValidationError
                              │                                         (issues: string[])
                              ▼
   argv ─► parseArgs ─► filterProducts ─► sortProducts ─┬─► printList(console)  "12.99 USD"
                                                        └─► renderHtml ─► writeFileSync(./products.html)
                              ▲
   scripts/test-products.ts ──┘  (imports pure fns; offline assertions; PASS/FAIL/ALL PASS)
```

## Technical Considerations

- **Dependencies / config:** No new dependencies. Relies on existing devDeps (`tsx`, `typescript`, `@types/node`). New `.ts` files are auto-included by `tsconfig.json`'s `include: ["scripts/**/*.ts"]`.
- **Type-check gate:** The deploy pipeline runs `pnpm build` → `node scripts/build.mjs` → `tsc --noEmit` (strict). All new code must type-check cleanly; use `import type` for type-only imports and explicit `.ts` extensions.
- **Security:** All product values rendered into HTML must be escaped with the `esc()` approach from `scripts/contact.ts:36` (`&`, `<`, `>`) to avoid HTML injection in the generated page. Values are rendered as text content (not into attributes), so the three-character set matches the contact precedent. No secrets, no network, no `SLACK_URL`.
- **Drift note:** The planning snapshot was commit `5297643`; the current checkout is `b857abb`. The two intervening commits are planning commits only (`plan: product-listing-test`) and do not touch any feature-relevant file — `scripts/contact.ts`, `scripts/test-contact.ts`, `package.json`, `tsconfig.json`, and `scripts/build.mjs` are unchanged, and `scripts/products.*` do not yet exist. No plan adjustment is needed for drift.

## Testing Strategy

- **Unit / offline (`scripts/test-products.ts`, run via `npm run test:products`):** framework-free `PASS`/`FAIL` lines ending in `ALL PASS`, exit `0`/`1` — mirroring `scripts/test-contact.ts` but with **no** network or `SLACK_URL` dependency. Cover: valid data passes validation; `validateProducts()` collects multiple issues and throws `ProductValidationError` with `issues.length` ≥ the number of seeded faults; duplicate `id` detected; non-integer/negative `price` detected; malformed `currency` detected; filtering (search, min/max, AND combination) returns expected subsets; sorting by name and price with asc/desc and tie-breaks is deterministic; price formatting yields `12.99 USD`; HTML rendering escapes `&`/`<`/`>` and includes exactly the filtered/sorted rows.
- **Integration / manual:** `npm run products` prints the seeded catalog; `npm run products -- --sort price --order desc --search <term> --min-price 10 --max-price 100` exercises combined flags; empty-result case prints `No products match.` and exits `0`; `npm run products -- --html` writes `./products.html` and prints `Wrote N products to ./products.html`; an unknown flag or `--sort bogus`/negative `--min-price` prints usage + error and exits `1`.
- **Type-check:** `npm run build` (or `npm run typecheck`) passes with no errors.

## Documentation Updates

- **`README.md`:** add a new "Products" section (do not replace the existing Contact/Slack docs) documenting: `npm run products` usage, every CLI flag with examples (`--sort`, `--order`, `--search`, `--min-price`, `--max-price`, `--html [path]`), the empty-result behavior, the `scripts/products.json` schema (`id`, `name`, `price` in minor units, `currency` as 3 uppercase letters), and the price-display convention (`12.99 USD`, fixed 2 decimals).

## Acceptance Criteria

- [ ] `scripts/products.ts`, `scripts/products.json`, and `scripts/test-products.ts` exist and are the only new files (plus edits to `package.json` and `README.md`).
- [ ] `npm run products` loads `scripts/products.json` relative to the module file and prints a human-readable listing with prices formatted as `12.99 USD`.
- [ ] Default ordering is `name asc`; `--sort price --order desc` reverses by price with deterministic tie-breaks (name asc, then id asc).
- [ ] `--search` is case-insensitive on `name`; `--min-price`/`--max-price` convert via `Math.round(n*100)`, compare on raw minor units, are inclusive, and AND with other filters.
- [ ] Empty result prints exactly `No products match.` and exits `0`.
- [ ] `--html` (no value) writes `./products.html` in cwd; `--html <path>` overrides; the page is self-contained (inline CSS, no external assets), HTML-escapes all values, contains the same filtered/sorted rows, and the command prints `Wrote N products to <path>` with the correct `N`.
- [ ] Invalid data causes `validateProducts()` to throw a single `ProductValidationError` listing every issue; `main()` prints them and exits `1`.
- [ ] Unknown flags or invalid flag values (e.g. `--sort bogus`, non-numeric or negative `--min-price`) print usage + error and exit `1`.
- [ ] `SLACK_URL` is not referenced; the feature and its test run fully offline.
- [ ] `package.json` has `products` and `test:products` scripts; `npm run test:products` prints `ALL PASS` and exits `0`.
- [ ] `npm run build` passes strict `tsc --noEmit`.
- [ ] `README.md` documents usage, all flags, and the JSON schema.

<details><summary><b>Implementation Detail</b></summary>

## Implementation Steps

### Phase 1 — Seed data: `scripts/products.json`

Create a committed JSON array of several realistic, valid products with mixed currencies to exercise cross-currency comparison. Example:

```json
[
  { "id": "sku-001", "name": "Aluminum Water Bottle", "price": 1899, "currency": "USD" },
  { "id": "sku-002", "name": "Bamboo Cutting Board",  "price": 2499, "currency": "USD" },
  { "id": "sku-003", "name": "Ceramic Coffee Mug",    "price": 1299, "currency": "EUR" },
  { "id": "sku-004", "name": "Wool Travel Blanket",   "price": 5900, "currency": "EUR" },
  { "id": "sku-005", "name": "Stainless Steel Straw Set", "price": 799, "currency": "USD" }
]
```

### Phase 2 — Module: `scripts/products.ts`

Follow `scripts/contact.ts` structure top-to-bottom. Concretely:

1. **Type model** (mirror `ContactInput` at `scripts/contact.ts:1`):
   ```ts
   export interface Product {
     id: string;
     name: string;
     price: number;   // integer minor units, >= 0
     currency: string; // 3 uppercase A-Z letters
   }
   ```
2. **Validation error** (mirror `ContactValidationError` at `scripts/contact.ts:8-15`):
   ```ts
   export class ProductValidationError extends Error {
     issues: string[];
     constructor(issues: string[]) {
       super(`Invalid products data: ${issues.join("; ")}`);
       this.name = "ProductValidationError";
       this.issues = issues;
     }
   }
   ```
3. **`validateProducts(data: unknown): Product[]`** (mirror the collect-all-then-throw shape of `validateContact()` at `scripts/contact.ts:19-33`): push an issue if root is not an array; for each element, check `id`/`name` are non-empty strings, `price` is an integer `>= 0` (`Number.isInteger`), `currency` matches `/^[A-Z]{3}$/`; track seen `id`s in a `Set` and push an issue on duplicates. Prefix each issue with the index and/or id (e.g. `products[2] (sku-003): price must be a non-negative integer`). Throw one `ProductValidationError` if `issues.length`.
4. **`loadProducts(path?: string): Product[]`** — resolve the default path with `fileURLToPath(new URL("./products.json", import.meta.url))`; `readFileSync(..., "utf8")`; `JSON.parse` (wrap in try/catch to throw a clear `Error` on syntax errors); call `validateProducts()`; return the typed array. Use `import { readFileSync } from "node:fs";` and `import { fileURLToPath } from "node:url";`.
5. **`esc(s: string): string`** — copy the helper from `scripts/contact.ts:36-38` (escape `&`/`<`/`>`).
6. **`formatPrice(p: Product): string`** → `(p.price / 100).toFixed(2) + " " + p.currency`.
7. **Filtering** — `filterProducts(products, { search?, minPrice?, maxPrice? })`: case-insensitive `name.toLowerCase().includes(search.toLowerCase())`; `price >= minPrice` and `price <= maxPrice` (minor units); AND together.
8. **Sorting** — `sortProducts(products, sort, order)`: compare by `name` (case-insensitive, `localeCompare` on lowercased) or `price`; apply `order` (desc negates); tie-break by name asc then id asc for stability.
9. **`renderHtml(products): string`** — a full self-contained document: `<!doctype html>`, `<title>Product Catalog</title>`, a `<style>` block with minimal inline CSS, and a table with one row per product (`id`, escaped `name`, `formatPrice`). Escape every dynamic value via `esc()`.
10. **`parseArgs(argv: string[])`** — walk `process.argv.slice(2)`; recognize `--sort`, `--order`, `--search`, `--min-price`, `--max-price`, `--html` (optional value — treat the next token as the path only if it is present and not another `--flag`). Validate: `--sort` ∈ {name,price}; `--order` ∈ {asc,desc}; `--min-price`/`--max-price` parse to a finite non-negative number (else invalid); unknown flags → invalid. On any invalid input, print `USAGE` + the specific error to `stderr` and `process.exit(1)`. Convert price bounds with `Math.round(n * 100)`.
11. **`main()`** (mirror `scripts/contact.ts:89-113`): `try` → parse args, `loadProducts()`, filter, sort; if `--html`, write the file with `writeFileSync` (default `./products.html` in cwd, i.e. resolved against cwd, not the module) and `console.log(`Wrote ${rows.length} products to ${path}`)`; else if no rows, `console.log("No products match.")` and `process.exit(0)`; else print one line per product. `catch`: if `err instanceof ProductValidationError`, print each issue; else print `err.message`; `process.exit(1)`.
12. **Direct-execution guard** — copy verbatim from `scripts/contact.ts:116-118`:
    ```ts
    if (import.meta.url === `file://${process.argv[1]}`) {
      await main();
    }
    ```

### Phase 3 — Test: `scripts/test-products.ts`

Mirror the `PASS`/`FAIL`/`ALL PASS` runner of `scripts/test-contact.ts` but **offline**. Import pure functions with `type`-only imports where applicable:
```ts
import {
  validateProducts,
  filterProducts,
  sortProducts,
  formatPrice,
  renderHtml,
  ProductValidationError,
  type Product,
} from "./products.ts";
```
Assert in-memory fixtures (do not read the JSON file): validation collects all issues and throws; valid data passes; filters (search/min/max/AND) return expected subsets; sort order + tie-breaks are deterministic; `formatPrice` → `"12.99 USD"`; `renderHtml` escapes `&`/`<`/`>` and contains exactly the expected rows. End with `console.log("ALL PASS"); process.exit(0)`; any failure prints `FAIL: ...` and `process.exit(1)`.

### Phase 4 — Wiring & docs

- `package.json` (scripts block at `package.json:5-10`): add `"products": "tsx scripts/products.ts"` and `"test:products": "tsx scripts/test-products.ts"` alongside the existing `contact`/`test:contact` entries.
- `README.md`: add the Products section described under Documentation Updates.

## Edge Cases

- **Root JSON not an array** → single issue, `ProductValidationError`.
- **Malformed JSON file** → clear `Error` from the `JSON.parse` try/catch (not a `ProductValidationError`); `main()` prints `err.message`, exit `1`.
- **Missing file** → `readFileSync` throws; surfaced as an `Error` message, exit `1`.
- **`--html` as the last token with no following value** → default to `./products.html`.
- **`--html --sort name`** → `--sort` is a flag, so `--html` takes the default path and `--sort` is parsed normally.
- **Empty filtered set with `--html`** → writes a valid page with zero product rows and prints `Wrote 0 products to <path>`.
- **`--min-price 0`** → valid (inclusive, non-negative).
- **Negative or non-numeric `--min-price`/`--max-price`** → invalid flag value, usage + error, exit `1`.
- **Mixed currencies** → price comparison is on raw minor units regardless of currency (documented quirk).
- **Duplicate `id`** → validation issue.
- **`--min-price` greater than `--max-price`** → not an error; simply yields an empty set → `No products match.`

## Rollout / Risks

- Low risk: additive, read-only, offline, no new dependencies, no change to the existing contact feature. The only generated artifact is `./products.html` (not committed). `.gitignore` is intentionally left unchanged; flag for human veto if a generated `products.html` appearing as untracked is undesirable.

## Dependencies & Related Work

- **Pattern source:** `scripts/contact.ts` — validation-error class (`:8`), collect-all validator (`:19`), `esc()` (`:36`), `main()` + exit codes (`:89-112`), direct-execution guard (`:116`).
- **Test pattern:** `scripts/test-contact.ts` (framework-free `PASS`/`FAIL`/`ALL PASS`) — but made offline (no `SLACK_URL`, no network).
- **Build gate:** `scripts/build.mjs` → `tsc --noEmit`; `tsconfig.json` (`strict`, `verbatimModuleSyntax`, `allowImportingTsExtensions`, `include: ["scripts/**/*.ts"]`).
- **No relation to:** Slack integration / `SLACK_URL`, any HTTP server, or external data sources.

</details>
