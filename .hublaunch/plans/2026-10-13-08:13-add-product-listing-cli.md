# Add a Headless Product-Listing TypeScript Module + CLI for the E-commerce Demo

## Plan Summary

- **What / why:** Add a read-only product catalog feature as a headless TypeScript module + CLI at `scripts/products.ts`, mirroring the existing `scripts/contact.ts` conventions. It lists products loaded from a committed `scripts/products.json`, with filtering/sorting/searching and an optional self-contained static HTML catalog export. There is NO HTTP server, NO web framework, and NO new runtime npm dependencies.
- **Key decisions:** JSON data file loaded via `fs` + `JSON.parse` resolved relative to the module (`import.meta.url`), not cwd; prices stored as integer minor units with a fixed 2-decimal display for all currencies; fail-fast validation that collects every issue into a single `ProductValidationError` (mirroring `ContactValidationError`); CLI argument errors print usage + error and exit 1.
- **Most important files:** new `scripts/products.ts` (module + CLI), new `scripts/test-products.ts` (offline typed test), new `scripts/products.json` (seed data); edits to `package.json` (two npm scripts) and `README.md` (new docs section).
- **Priority / complexity:** Medium complexity, self-contained. The pattern already exists in `scripts/contact.ts`; the net-new logic is argument parsing, filter/sort, and HTML rendering. Low risk — additive only, touches no existing feature and is independent of Slack.
- **Verification:** New files must pass strict `tsc --noEmit` (run via `npm run build` → `scripts/build.mjs`); `npm run products` must produce meaningful output from the seed JSON; `npm run test:products` must pass fully offline (no network, no env var).

## Problem Statement

The repository is an e-commerce demo that currently ships a single Slack-backed "Contact Us" feature (`scripts/contact.ts`). It has no way to represent or list a product catalog. We need to add a **product listing** capability so the demo can display products, with basic list/filter/sort/search ergonomics and an optional static HTML catalog page for sharing.

The feature must be a **headless TypeScript module + CLI**, following the established repo convention (a `tsx`-run script under `scripts/` with a companion typed test), so it integrates with the existing build/typecheck pipeline and requires no new infrastructure.

#### Planning Context

**Key requirements (confirmed, treat as decided):**

- **Output shape:** A headless TypeScript module + CLI at `scripts/products.ts` (mirrors `scripts/contact.ts`) that lists products to the console, plus a companion typed test `scripts/test-products.ts`, plus an optional `--html` flag that writes a self-contained static catalog HTML page. No HTTP server, no web framework, no new runtime npm dependencies.
- **Data source:** A committed `scripts/products.json`, loaded at runtime via `fs` + `JSON.parse`, resolved **relative to the module file** (`import.meta.url`) not cwd. `loadProducts(path?)` accepts an optional override path.
- **Product schema (minimal):** `id` (string, non-empty, unique), `name` (string, non-empty), `price` (integer ≥ 0, minor units, e.g. `1299` = 12.99), `currency` (3 uppercase letters, ISO 4217 format `/^[A-Z]{3}$/`).
- **Read-only:** list / filter / sort / display only. No create, update, or delete.
- **Slack-independent:** `SLACK_URL` is not used anywhere in this feature.
- **CLI flags:** `--sort name|price`, `--order asc|desc` (default `name asc`); `--search <substring>` case-insensitive on `name`; `--min-price <n>` / `--max-price <n>` in major-unit decimals converted with `Math.round(n * 100)`, compared on raw minor units regardless of currency. Filters AND together. Empty result prints `"No products match."` and exits 0.
- **`--html`:** with no value writes `./products.html` in cwd; `--html <path>` overrides. Self-contained page (inline CSS, no external assets, HTML-escaped values) containing the same filtered/sorted rows. Prints `"Wrote N products to <path>"` where N = count of rows written.
- **Price display:** 2-decimal major units + currency code, e.g. `"12.99 USD"`. Fixed 2-decimal exponent for all currencies.
- **Validation:** fail fast. `validateProducts()` collects every issue (root not array, missing/wrong-typed field, empty `id`/`name`, duplicate `id`, non-integer or negative `price`, malformed `currency`) and throws one `ProductValidationError` (extends `Error`, `issues: string[]`). `main()` prints issues, exits 1. Mirrors `ContactValidationError`.
- **Argument errors:** Unknown flags or invalid flag values print usage + error and exit 1.
- **Wiring:** `package.json` gains `"products": "tsx scripts/products.ts"` and `"test:products": "tsx scripts/test-products.ts"`. `README.md` documents usage, flags, and the JSON schema.

**Decisions made (with rationale):**

- **Prices as integer minor units** (not floats) to avoid floating-point rounding bugs in money math; display converts with `(price / 100).toFixed(2)`. Fixed 2-decimal exponent for all currencies is accepted (JPY etc. render with two decimals) — per-currency exponents are explicitly out of scope.
- **Price filters compared on raw minor units regardless of currency** — this is an intentional demo simplification (no FX conversion). `--min-price`/`--max-price` are major-unit decimals converted via `Math.round(n * 100)` so the user types `12.99` and it compares against `1299`.
- **Deterministic sort tie-breaks:** when sorting by `price` and two prices tie, break ties by `name` (case-insensitive) ascending, then by `id` ascending. `name` sort is case-insensitive to match the case-insensitive `--search`. Chosen for stable, intuitive output since exact tie-break rules were unspecified.
- **Validation collects all issues then throws once** (mirrors `validateContact()` at `scripts/contact.ts:19`), prefixing each issue with the offending index/id so the user can fix everything in one pass.
- **Offline test:** unlike `scripts/test-contact.ts` (a *live* test that requires `SLACK_URL` and hits the network), `scripts/test-products.ts` must be fully offline — it imports pure functions and asserts on in-memory data, with no network and no env dependency.
- **Module-relative JSON resolution** via `new URL("./products.json", import.meta.url)` so `npm run products` works regardless of cwd and is consistent with the project's ESM setup (`"type": "module"`).

**Out of scope:** CRUD (create/update/delete), Slack posting, pagination, product images, categories, descriptions, SKU, stock/inventory, per-currency minor-unit exponents (JPY etc.), external/remote data sources, HTTP serving, and any new runtime dependency.

## Detailed Requirements

### Functional

1. **Load products** from `scripts/products.json` via `fs.readFileSync` + `JSON.parse`, path resolved relative to the module file. `loadProducts(path?: string)` accepts an optional override path (used by the test and for custom data files).
2. **Validate** the parsed data with `validateProducts(data: unknown): Product[]`, collecting every issue and throwing a single `ProductValidationError` on any failure.
3. **Filter**: `--search <substring>` (case-insensitive, matches `name`); `--min-price`/`--max-price` (inclusive bounds, compared on minor units). Multiple filters AND together.
4. **Sort**: `--sort name|price` with `--order asc|desc`. Default is `name asc`. Deterministic tie-breaking as described above.
5. **Console output**: a simple human-readable line/table format per product including `id`, `name`, and formatted price (`12.99 USD`). Empty result prints exactly `No products match.` and exits 0.
6. **HTML export**: `--html [path]` writes a self-contained static HTML page (inline CSS, no external assets, all values HTML-escaped) with the same filtered/sorted rows, one row per product (id, name, formatted price), a `<title>` of "Product Catalog". Default output path `./products.html` (cwd). Prints `Wrote N products to <path>` where N is the number of rows written.
7. **Argument errors**: unknown flags, missing required flag values, or invalid flag values (e.g. non-numeric `--min-price`, `--sort foo`) print a usage string plus a specific error to stderr and exit 1.

### Technical

- **Language/runtime:** TypeScript executed via `tsx` (Node v20.20.2 cannot run `.ts` directly). ESM (`"type": "module"`).
- **Imports:** must use explicit `.ts` extensions and `import type { ... }` for type-only symbols, because `tsconfig.json` sets `allowImportingTsExtensions: true` and `verbatimModuleSyntax: true` (see `tsconfig.json:6-7`).
- **No runtime deps:** use only Node built-ins (`node:fs`, `node:url`, `node:path` as needed). `package.json` has only devDeps (`tsx`, `typescript`, `@types/node`); keep it that way.
- **Strict type-check:** new files must pass `tsc --noEmit` under `strict: true`. The deploy pipeline runs `pnpm build` → `scripts/build.mjs` → `tsc --noEmit`.
- **Direct-execution guard:** gate `main()` behind `if (import.meta.url === \`file://${process.argv[1]}\`)` (copied verbatim from `scripts/contact.ts:116`) so the test can import the module without triggering the CLI.

### Non-Functional

- **Determinism:** identical input + flags always produce identical ordering (explicit tie-breaks).
- **Self-contained HTML:** the generated page must render correctly with no network access and no external files.
- **Safety:** all product values rendered into HTML must be escaped to prevent broken markup / injection.
- **Offline test:** `npm run test:products` must pass with no network and no environment variables set.

## Proposed Solution

Create `scripts/products.ts` as a headless module that exports pure, testable functions (`loadProducts`, `validateProducts`, `filterProducts`, `sortProducts`, `formatPrice`, `renderHtml`, `parseArgs`) plus a CLI `main()` guarded by the direct-execution check. The module mirrors the structure and idioms of `scripts/contact.ts`: a typed interface, a `*ValidationError` class collecting `issues: string[]`, an `esc()` HTML-escape helper, and a `main()` that prints errors and sets the process exit code.

Data flows: `loadProducts()` reads + parses JSON → `validateProducts()` returns a typed `Product[]` (or throws) → `filterProducts()` applies search/price filters → `sortProducts()` orders the result → the CLI either prints lines to the console or, with `--html`, calls `renderHtml()` and writes the file.

```
scripts/products.json  --(fs + JSON.parse, URL relative to module)-->  loadProducts()
                                                                            |
                                                                 validateProducts()  --fail-->  ProductValidationError (exit 1)
                                                                            | Product[]
   argv --> parseArgs() --(opts | usage error, exit 1)-->  filterProducts() --> sortProducts()
                                                                            |
                                           +--------------------------------+--------------------------------+
                                           | (default)                                                        | (--html)
                                     console lines                                                     renderHtml() + fs.writeFileSync
                                 ("No products match." / exit 0)                              ("Wrote N products to <path>")
```

## Acceptance Criteria

1. `scripts/products.ts`, `scripts/test-products.ts`, and `scripts/products.json` exist and are committed.
2. `npm run build` (i.e. `tsc --noEmit`, strict) passes with the new files present.
3. `npm run products` prints a readable listing of the seed products (default `name asc`), each line showing id, name, and a price formatted like `12.99 USD`.
4. `npm run products -- --search <substring>` returns only products whose `name` contains the substring (case-insensitive); a non-matching search prints exactly `No products match.` and exits 0.
5. `npm run products -- --sort price --order desc` lists products by price high→low with deterministic tie-breaking; `--sort name` / `--order asc` behave as specified; default (no flags) is `name asc`.
6. `npm run products -- --min-price 10 --max-price 20` includes only products whose minor-unit price is within `[1000, 2000]` inclusive; filters AND with `--search`.
7. `npm run products -- --html` writes `./products.html`; `--html out/catalog.html` writes to the given path. The file is self-contained (inline CSS, no external refs), HTML-escapes all values, contains one row per filtered/sorted product, and the command prints `Wrote N products to <path>` with the correct count.
8. An invalid `scripts/products.json` (e.g. duplicate id, negative price, bad currency) causes `main()` to print all collected issues and exit 1 via `ProductValidationError`.
9. Unknown flags (e.g. `--foo`), missing flag values, or invalid values (e.g. `--sort bogus`, `--min-price abc`) print usage + a specific error to stderr and exit 1.
10. `npm run test:products` passes fully offline (no network, no `SLACK_URL`), printing `PASS` lines and `ALL PASS`, exiting 0.
11. `README.md` has a new Products section documenting usage, every flag, and the JSON schema. `SLACK_URL` is referenced nowhere in the products feature.

<details><summary><b>Implementation Detail</b></summary>

## Implementation Steps

### Phase 1 — `scripts/products.ts` (module core)

Create the file mirroring `scripts/contact.ts`. Concrete references:

- **Typed interface** (like `ContactInput` at `scripts/contact.ts:1-6`):
  ```ts
  export interface Product {
    id: string;
    name: string;
    price: number;   // integer, minor units (e.g. 1299 = 12.99)
    currency: string; // 3 uppercase letters, e.g. "USD"
  }
  ```
- **Validation error** (mirror `ContactValidationError` at `scripts/contact.ts:8-15`):
  ```ts
  export class ProductValidationError extends Error {
    issues: string[];
    constructor(issues: string[]) {
      super(`Invalid product data: ${issues.join("; ")}`);
      this.name = "ProductValidationError";
      this.issues = issues;
    }
  }
  ```
- **`validateProducts(data: unknown): Product[]`** (mirror the collect-all pattern of `validateContact()` at `scripts/contact.ts:19-33`):
  - Push `"root: expected an array of products"` if `!Array.isArray(data)` and throw immediately (cannot iterate a non-array).
  - For each entry, prefix issues with the index and (when available) id, e.g. `` `products[${i}] (${id}): price must be an integer >= 0` ``. Check: `id` is a non-empty string; `name` is a non-empty string; `price` is an integer (`Number.isInteger`) and `>= 0`; `currency` is a string matching `/^[A-Z]{3}$/`.
  - Track seen ids in a `Set<string>`; push a duplicate-id issue when an id repeats.
  - If `issues.length` throw `new ProductValidationError(issues)`; otherwise return the validated array typed as `Product[]`.
- **`CURRENCY_RE = /^[A-Z]{3}$/`** module constant (parallels `EMAIL_RE` at `scripts/contact.ts:17`).
- **`esc(s: string): string`** — copy the three-character escape helper from `scripts/contact.ts:36-38` (escapes `&`, `<`, `>`). Values render as HTML text content, so the three-char set matches contact's precedent.
- **`formatPrice(price: number, currency: string): string`** → `` `${(price / 100).toFixed(2)} ${currency}` `` (fixed 2-decimal exponent for all currencies).
- **`loadProducts(path?: string): Product[]`**:
  ```ts
  import { readFileSync } from "node:fs";
  const jsonPath = path ?? new URL("./products.json", import.meta.url);
  const raw = readFileSync(jsonPath, "utf8");
  return validateProducts(JSON.parse(raw));
  ```
  Using `new URL("./products.json", import.meta.url)` resolves relative to the module file, not cwd (consistent with `"type": "module"`). `readFileSync` accepts a `URL`; if `path` is a string it is used directly.

### Phase 2 — Filtering & sorting (pure functions in `scripts/products.ts`)

- **`filterProducts(products, opts)`**: apply `search` (case-insensitive `name.toLowerCase().includes(term.toLowerCase())`), `minPrice` (`price >= minPrice`), `maxPrice` (`price <= maxPrice`); bounds inclusive; multiple filters AND together. `minPrice`/`maxPrice` are already-converted minor-unit integers (conversion happens in `parseArgs`).
- **`sortProducts(products, sort, order)`**: comparator for `sort === "price"` uses numeric `a.price - b.price`, tie-break by `name` (case-insensitive `localeCompare`), then `id`; `sort === "name"` uses case-insensitive `name` compare, tie-break by `id`. Reverse the comparator result when `order === "desc"`. Operate on a copy (`[...products].sort(...)`) to avoid mutating input.

### Phase 3 — Argument parsing & CLI `main()`

- **`parseArgs(argv: string[]): Options`** reads `process.argv.slice(2)`. Recognized flags: `--sort <name|price>`, `--order <asc|desc>`, `--search <substring>`, `--min-price <n>`, `--max-price <n>`, `--html [path]`. Defaults: `sort="name"`, `order="asc"`.
  - `--html` is value-optional: if the next token is missing or begins with `--`, use the default `./products.html`; otherwise consume it as the path.
  - `--min-price`/`--max-price`: parse with `Number(value)`; reject `NaN` or negative (invalid flag value); convert via `Math.round(n * 100)` to minor units.
  - Validate enum values (`--sort` ∈ {name, price}, `--order` ∈ {asc, desc}); reject unknown flags and missing required values.
  - On any parse error, throw a lightweight error (or return a discriminated result) that `main()` turns into: print `USAGE` string to stderr, print the specific error, `process.exit(1)`.
- **`USAGE`** constant: a multiline string listing every flag and default, printed on argument errors.
- **`main()`** (mirror `scripts/contact.ts:89-113`):
  ```ts
  try {
    const opts = parseArgs(process.argv.slice(2));
    const products = sortProducts(filterProducts(loadProducts(), opts), opts.sort, opts.order);
    if (opts.html !== undefined) {
      const html = renderHtml(products);
      writeFileSync(opts.html, html, "utf8");
      console.log(`Wrote ${products.length} products to ${opts.html}`);
      process.exit(0);
    }
    if (products.length === 0) { console.log("No products match."); process.exit(0); }
    for (const p of products) console.log(`${p.id}  ${p.name}  ${formatPrice(p.price, p.currency)}`);
    process.exit(0);
  } catch (err) {
    if (err instanceof ProductValidationError) {
      console.error("Validation failed:");
      for (const i of err.issues) console.error(`  - ${i}`);
    } else {
      console.error(USAGE);
      console.error(`Error: ${(err as Error).message}`);
    }
    process.exit(1);
  }
  ```
  Note: distinguish `ProductValidationError` (data problem → print issues) from argument errors (print usage). Keep exit codes exactly as specified.
- **Direct-execution guard** — copy verbatim from `scripts/contact.ts:116-118`:
  ```ts
  if (import.meta.url === `file://${process.argv[1]}`) { await main(); }
  ```

### Phase 4 — `renderHtml(products: Product[]): string`

- Return a complete HTML document string: `<!doctype html>`, `<title>Product Catalog</title>`, a small inline `<style>` block (no external assets), and a table/list with one row per product showing `esc(p.id)`, `esc(p.name)`, and `esc(formatPrice(p.price, p.currency))`. All dynamic values pass through `esc()`.

### Phase 5 — `scripts/products.json` (seed data)

- Commit a small set of realistic, valid sample products — several entries with **mixed currencies** (e.g. USD and EUR) to exercise the cross-currency price-comparison quirk and give `npm run products` meaningful output. Example:
  ```json
  [
    { "id": "sku-001", "name": "Aluminum Water Bottle", "price": 1899, "currency": "USD" },
    { "id": "sku-002", "name": "Canvas Tote Bag", "price": 1250, "currency": "EUR" },
    { "id": "sku-003", "name": "Ceramic Coffee Mug", "price": 999, "currency": "USD" },
    { "id": "sku-004", "name": "Bamboo Cutting Board", "price": 3499, "currency": "EUR" }
  ]
  ```
  All entries must satisfy `validateProducts()` (unique non-empty ids, non-empty names, integer non-negative prices, 3-uppercase-letter currencies).

### Phase 6 — `scripts/test-products.ts` (offline typed test)

Pattern: framework-free `PASS`/`FAIL`/`ALL PASS` runner (like `scripts/test-contact.ts`) but **fully offline** — no `SLACK_URL`, no network. Use `type`-only imports where appropriate and `.ts` extensions:
```ts
import {
  validateProducts,
  ProductValidationError,
  filterProducts,
  sortProducts,
  formatPrice,
  renderHtml,
  type Product,
} from "./products.ts";
```
Cover at minimum:
- `validateProducts` accepts valid data and returns the typed array.
- `validateProducts` collects multiple issues (e.g. empty id, negative price, bad currency, duplicate id) into one `ProductValidationError` with `issues.length` matching expectations.
- `filterProducts` honors case-insensitive search and inclusive min/max price, ANDed.
- `sortProducts` orders by name/price with correct `asc`/`desc` and deterministic tie-breaks.
- `formatPrice(1299, "USD") === "12.99 USD"`.
- `renderHtml` escapes a product name containing `<`/`&`/`>` (assert the escaped entities appear and the raw characters do not).

Print `PASS`/`FAIL` per assertion; on all passing print `ALL PASS` and `process.exit(0)`; on any failure print the failure and `process.exit(1)`.

### Phase 7 — Wiring: `package.json` + `README.md`

- **`package.json`** (scripts block at `package.json:5-10`): add alongside `contact`/`test:contact`:
  ```json
  "products": "tsx scripts/products.ts",
  "test:products": "tsx scripts/test-products.ts",
  ```
  Add NO dependencies.
- **`README.md`**: add a new **Products** section (do not replace the existing Contact/Slack docs). Document: running `npm run products`, every CLI flag with defaults and examples (including `--html`), the `scripts/products.json` schema (field names, types, minor-unit price convention, currency format), and how to run the offline test (`npm run test:products`). Note that `npm run` flags are passed after `--` (e.g. `npm run products -- --sort price --order desc`).

## Edge Cases

- **Empty filtered result (non-HTML):** print exactly `No products match.` and exit 0 (not an error).
- **Empty filtered result (`--html`):** still write a valid (empty-table) HTML page and print `Wrote 0 products to <path>`, exit 0.
- **`--html` as the last arg with no path:** default to `./products.html` (value-optional parsing must not consume a following flag as the path).
- **`--min-price`/`--max-price` with non-numeric or negative values:** treated as invalid flag values → usage + error, exit 1.
- **`min > max`:** yields an empty result set (→ `No products match.`), which is acceptable and not an argument error.
- **Non-integer minor-unit price in JSON** (e.g. `12.99`): a validation issue (price must be an integer) → `ProductValidationError`.
- **Cross-currency price filter:** comparisons are on raw minor units regardless of currency (intentional demo simplification; documented).
- **Duplicate flags** (e.g. two `--sort`): last-one-wins is acceptable; document if implemented, otherwise treat the behavior as last-wins for simplicity.
- **Root JSON not an array:** single `root: expected an array of products` issue, throw immediately.

## Technical Considerations

- **Dependencies:** none added. Only `node:fs` and `node:url` (built-ins). Keeps `package.json` devDeps-only.
- **Config / build:** files auto-included via `tsconfig.json:14` (`include: ["scripts/**/*.ts"]`). Must satisfy `strict`, `verbatimModuleSyntax` (use `import type`), and `allowImportingTsExtensions` (use `.ts` in import specifiers). Deploy runs `pnpm build` → `scripts/build.mjs:7` → `tsc --noEmit`; a type error there fails the pipeline, so run `npm run build` locally before finishing.
- **Security:** all product values are HTML-escaped via `esc()` before landing in the generated HTML (text content; `&`/`<`/`>` suffice, matching `scripts/contact.ts:36`). No remote I/O, no eval, no shell.
- **`.gitignore`:** currently ignores `hublaunch.config.js`, `.hula-worktrees/`, `.env`, `node_modules/`, `.hublaunch/tmp/` — it does NOT ignore `products.html` or `scripts/products.json`. `scripts/products.json` SHOULD be tracked/committed (it is the data source). A generated `./products.html` is a build artifact; leave `.gitignore` unchanged unless the implementer prefers to add an ignore entry for `products.html` (flagged for human veto — not required).

## Testing Strategy

- **Unit (via `scripts/test-products.ts`, offline):** validation (happy path + multi-issue collection), filtering (search + price AND), sorting (name/price, asc/desc, tie-breaks), `formatPrice`, and `renderHtml` escaping — as enumerated in Phase 6.
- **Integration / build:** `npm run build` (strict `tsc --noEmit`) must pass with the new files.
- **Manual smoke:**
  - `npm run products` → readable default `name asc` listing.
  - `npm run products -- --sort price --order desc` → price high→low.
  - `npm run products -- --search mug` → case-insensitive name filter.
  - `npm run products -- --min-price 10 --max-price 20` → inclusive minor-unit bounds.
  - `npm run products -- --html` → writes `./products.html`, prints `Wrote N products to ./products.html`; open the file to confirm it renders standalone.
  - `npm run products -- --sort bogus` and `npm run products -- --unknown` → usage + error, exit 1.
  - Temporarily point `loadProducts()` at an invalid JSON (or add a bad entry) → confirm all issues print and exit 1.
  - `npm run test:products` with `SLACK_URL` unset and no network → `ALL PASS`.

## Documentation Updates

- **`README.md`:** new Products section (usage, all flags with defaults + examples, JSON schema, offline test instructions, `npm run ... --` flag-passing note). Do not remove the existing Contact/Slack docs.

## Dependencies & Related Work

- **Template:** `scripts/contact.ts` (validation-error class `:8`, collect-all `validateContact` `:19`, `esc()` `:36`, `main()` error/exit pattern `:89-112`, direct-execution guard `:116`).
- **Test template:** `scripts/test-contact.ts` (framework-free PASS/FAIL runner) — but the products test must be offline (no `SLACK_URL`, no network), unlike the contact test which is live.
- **Build pipeline:** `scripts/build.mjs` (runs `tsc --noEmit`); `tsconfig.json` (strict, `verbatimModuleSyntax`, `allowImportingTsExtensions`).
- **Wiring:** `package.json:5-10` scripts block.
- No external services, no runtime npm dependencies, independent of the Slack/contact feature.

</details>
