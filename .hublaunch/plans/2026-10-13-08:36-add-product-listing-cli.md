# Add a Read-Only Product Listing Module + CLI for the E-commerce Demo

## Plan Summary

- **What / why:** Add a headless TypeScript product-listing feature (`scripts/products.ts`) plus a typed offline test (`scripts/test-products.ts`), mirroring the existing `scripts/contact.ts` conventions, so the e-commerce demo can list/filter/sort products from a committed `scripts/products.json` and optionally emit a self-contained static HTML catalog. No HTTP server, no web framework, no new runtime npm dependencies.
- **Key decisions:** Read-only (list/filter/sort/display only — no CRUD, no Slack); prices stored as integer **minor units** with a 3-letter ISO-4217 currency; fail-fast validation that collects **all** issues into a single `ProductValidationError` (mirrors `ContactValidationError` at `scripts/contact.ts:8`); price filters compared on raw minor units **regardless of currency** (an accepted, documented cross-currency quirk).
- **Most important files:** new `scripts/products.ts` (module + CLI), new `scripts/products.json` (seed data), new `scripts/test-products.ts` (offline test), edits to `package.json` (two npm scripts) and `README.md` (new docs section).
- **Patterns to follow:** `ContactValidationError` + `validateContact()` (`scripts/contact.ts:8`, `scripts/contact.ts:19`), the `esc()` HTML escaper (`scripts/contact.ts:36`), the direct-execution guard (`scripts/contact.ts:116`), the `main()` → `console.error`/`process.exit` shape (`scripts/contact.ts:89`), and the framework-free `PASS`/`FAIL`/`ALL PASS` runner (`scripts/test-contact.ts`).
- **Priority / complexity:** Medium priority, low–medium complexity. Self-contained, additive change; the main care areas are argument parsing, deterministic sorting, and strict-mode type-checking under `tsc --noEmit`.

## Problem Statement

The repository currently ships a single demo feature — a "Contact Us → Slack" module (`scripts/contact.ts`) — and no way to represent or display an e-commerce product catalog. We want to add a **product listing** capability for the e-commerce demo.

The feature must be a **headless TypeScript module + CLI** at `scripts/products.ts`, patterned directly on `scripts/contact.ts`, that loads products from a committed `scripts/products.json`, validates them, and lists them to the console with filtering and sorting options. It also optionally renders a self-contained static HTML catalog page. It is **read-only** and **independent of Slack**.

#### Planning Context

**Key requirements (confirmed, treat as decided):**

- **Output shape:** A headless TS module + CLI at `scripts/products.ts` (mirrors `scripts/contact.ts`) that lists products to the console, a companion typed test `scripts/test-products.ts`, and an optional `--html` flag that writes a self-contained static catalog HTML page. **No** HTTP server, **no** web framework, **no** new runtime npm dependencies.
- **Data source:** A committed JSON file `scripts/products.json`, loaded at runtime via `fs` + `JSON.parse`, resolved **relative to the module file** (`import.meta.url`), not the cwd. `loadProducts(path?)` accepts an optional override path.
- **Product schema (minimal):** `id` (string, non-empty, unique), `name` (string, non-empty), `price` (integer ≥ 0, minor units — e.g. `1299` = 12.99), `currency` (3 uppercase letters, ISO-4217 format).
- **Read-only:** list / filter / sort / display. No create, update, or delete.
- **Slack-independent:** `SLACK_URL` is not used anywhere in this feature.
- **CLI flags:**
  - `--sort name|price` and `--order asc|desc` (default `name asc`).
  - `--search <substring>` — case-insensitive match on `name`.
  - `--min-price <n>` / `--max-price <n>` — accept **major-unit decimals**, convert with `Math.round(n * 100)`, compare on **raw minor units regardless of currency**. Bounds are inclusive.
  - Filters **AND** together. Empty result prints `No products match.` and exits `0`.
  - `--html` with no value writes `./products.html` in cwd; `--html <path>` overrides. Produces a self-contained page (inline CSS, no external assets, HTML-escaped values) containing the same filtered/sorted rows. Prints `Wrote N products to <path>`.
- **Price display:** 2-decimal major units + currency code, e.g. `12.99 USD`. Fixed 2-decimal exponent for **all** currencies.
- **Validation (fail fast):** `validateProducts()` collects **every** issue (root not an array, missing/wrong-typed field, empty `id`/`name`, duplicate `id`, non-integer or negative `price`, malformed `currency`) and throws one `ProductValidationError` (extends `Error`, `issues: string[]`). `main()` prints the issues and exits `1`. Mirrors `ContactValidationError` in `scripts/contact.ts`.
- **Unknown flags / invalid flag values:** print usage + error, exit `1`.
- **Wiring:** `package.json` gains `"products": "tsx scripts/products.ts"` and `"test:products": "tsx scripts/test-products.ts"`. `README.md` gains a section documenting usage, flags, and the JSON schema.

**Decisions made (with rationale):**

- **Prices as integer minor units + ISO-4217 currency string** — avoids floating-point money bugs; display converts once at the edge via `(price / 100).toFixed(2)`.
- **Price filters compare raw minor units across currencies** — explicitly requested. This means a `--max-price 20` filter treats `1500 EUR` and `1500 USD` identically (both "15.00"); no FX conversion is performed. This is a deliberate demo simplification and is documented in the README so users are not surprised.
- **Fixed 2-decimal exponent for all currencies** — zero-decimal currencies (e.g. JPY) will render with two decimals (`1000 JPY` → `10.00 JPY`). Per-currency minor-unit exponents are explicitly out of scope.
- **Collect-all-then-throw validation** — mirrors `validateContact()` so a single run surfaces every data problem at once, rather than failing on the first.
- **Resolve `products.json` relative to the module** via `new URL("./products.json", import.meta.url)` — makes `npm run products` work from any cwd and is consistent with `"type": "module"`.
- **Deterministic sort tie-breaks** — when sorting by `price` and two prices tie, break by `name` (case-insensitive), then by `id`; name sorting is case-insensitive to match the case-insensitive `--search`. Chosen for stable, intuitive, reproducible output (exact rules were unspecified).

**Out of scope:** CRUD (create/update/delete), Slack posting, pagination, product images, categories, descriptions, SKU, stock/inventory, per-currency minor-unit exponents (JPY etc.), external/remote data sources, HTTP server, web framework, and any new runtime npm dependency.

## Detailed Requirements

### Functional

1. Load products from `scripts/products.json` (default) or a caller-supplied path via `loadProducts(path?)`.
2. Validate the loaded data; on any problem, throw a single `ProductValidationError` listing every issue.
3. List validated products to the console in a human-readable line/table format including `id`, `name`, and formatted price (`12.99 USD`).
4. Support filtering by `--search` (case-insensitive substring on `name`), `--min-price`, and `--max-price` (inclusive, minor-unit comparison). Multiple filters AND together.
5. Support sorting by `--sort name|price` and `--order asc|desc`, defaulting to `name asc`, with deterministic tie-breaks.
6. When no products match the filters, print `No products match.` and exit `0`.
7. Support `--html [path]` to write a self-contained HTML catalog of the same filtered/sorted rows; default output path `./products.html` (cwd); print `Wrote N products to <path>` where `N` is the count of rows written.
8. On unknown flags or invalid flag values, print usage text plus a specific error, and exit `1`.

### Technical

- TypeScript, ESM (`"type": "module"`), run via `tsx` (Node v20.20.2 cannot execute `.ts` directly).
- Imports must use **explicit `.ts` extensions** and `import type { ... }` for type-only symbols (required by `verbatimModuleSyntax: true` and `allowImportingTsExtensions: true` in `tsconfig.json`).
- Only Node built-ins: `node:fs` (read file), `node:url` (`URL` / `fileURLToPath`). No runtime npm deps.
- Must pass strict `tsc --noEmit` (the deploy pipeline runs `pnpm build` → `scripts/build.mjs` → `tsc --noEmit`).
- Reuse the direct-execution guard so the module is importable by the test without running `main()`.

### Non-Functional

- **Deterministic** output (stable sort tie-breaks) so tests and HTML diffs are reproducible.
- **Offline** — neither the module nor its test performs network I/O or depends on environment variables (notably no `SLACK_URL`).
- **Safe HTML** — every value interpolated into the HTML page is escaped (`&`, `<`, `>` at minimum, matching `esc()` precedent).
- **Fail-fast & actionable** — validation errors name the offending product (by index and/or `id`) and the specific problem.

## Proposed Solution

Create a new self-contained module `scripts/products.ts` that:

1. Defines a `Product` interface and a `ProductValidationError extends Error` with `issues: string[]` (mirroring `ContactValidationError` at `scripts/contact.ts:8`).
2. Exposes pure, testable functions: `loadProducts(path?)`, `validateProducts(data)`, `filterProducts(products, opts)`, `sortProducts(products, opts)`, `formatPrice(product)`, `renderHtml(products)`, and `parseArgs(argv)`.
3. Has a `main()` that parses `process.argv`, loads + validates, filters + sorts, then either prints to console or writes the HTML page — using the same `console.error` + `process.exit` failure shape as `scripts/contact.ts:89`.
4. Ends with the direct-execution guard from `scripts/contact.ts:116` so the test can import the pure functions without triggering `main()`.

The data lives in a committed `scripts/products.json` seeded with a handful of realistic, valid products across mixed currencies (e.g. USD/EUR) to exercise the cross-currency price-comparison behavior. The test `scripts/test-products.ts` imports the pure functions and asserts validation, filtering, sorting, formatting, and HTML-escaping behavior fully offline.

Because the feature touches a module, a data file, a test, and two config/doc files, here is the component relationship:

```
          scripts/products.json  (committed seed data)
                     |
                     v  loadProducts() via new URL("./products.json", import.meta.url)
   scripts/products.ts  ──  validateProducts() ──> ProductValidationError (all issues)
     | (pure fns)              |
     |  filter/sort/format     +── main(): console listing  OR  renderHtml() -> ./products.html
     |
     +── imported by ──> scripts/test-products.ts  (offline PASS/FAIL/ALL PASS)

   package.json  : "products" + "test:products" npm scripts (tsx)
   README.md     : new "Product Listing" section (usage, flags, schema)
```

## Technical Considerations

- **Dependencies / config:** No new runtime dependencies. `tsx`, `typescript`, `@types/node` already present as devDeps (`package.json:11-15`). New `.ts` files under `scripts/` are auto-included by `tsconfig.json` (`include: ["scripts/**/*.ts"]`).
- **Module resolution:** Resolve the JSON path with `new URL("./products.json", import.meta.url)` and read via `readFileSync(url, "utf8")`. `readFileSync` accepts a `URL`, avoiding a manual `fileURLToPath` call; either approach is acceptable as long as it is relative to the module, not cwd.
- **Strict typing:** `JSON.parse` returns `any`/`unknown`; validate structurally before treating entries as `Product`. Prefer narrowing from `unknown` so `tsc --strict` passes. Use `import type` for the `Product`/options types in the test.
- **Security:** All product values rendered into HTML must pass through the escape helper; the page uses only inline CSS and no external assets. No network, no secrets, no `SLACK_URL`.
- **Repo drift:** Planned against commit `5297643d1b8a9d0f070a4f70cf5d80153b66bd32` (branch `main`). The current checkout is on branch `product-listing-test`; the referenced files (`scripts/contact.ts`, `scripts/test-contact.ts`, `package.json`, `tsconfig.json`, `scripts/build.mjs`, `README.md`, `.gitignore`) were re-verified and match the cited line numbers. No drift affecting this plan was observed.

## Testing Strategy

### Unit / offline (`scripts/test-products.ts`)

A framework-free `tsx` script mirroring `scripts/test-contact.ts` — prints `PASS`/`FAIL` lines, ends with `ALL PASS`, and exits `0`/`1`. It must be **fully offline** (no network, no `SLACK_URL`, unlike `test-contact.ts`). Cover at minimum:

- **Valid data passes:** `validateProducts()` on a good array does not throw.
- **Validation collects all issues:** a crafted bad array (root not array, missing field, empty `id`/`name`, duplicate `id`, non-integer/negative `price`, malformed `currency`) throws `ProductValidationError` with `issues.length` equal to the number of seeded problems.
- **Filtering:** `--search` is case-insensitive; `--min-price`/`--max-price` are inclusive and compare on minor units; filters AND together; a no-match filter yields an empty array.
- **Sorting:** `name asc` default; `price desc`; deterministic tie-breaks (equal prices → name → id).
- **Price formatting:** `1299` → `12.99` with currency code; zero-decimal currency still shows two decimals.
- **HTML rendering:** output contains one row per product and HTML-escapes a value containing `&`/`<`/`>`.
- **Arg parsing:** unknown flag and invalid flag value (e.g. non-numeric `--min-price`, bad `--sort`/`--order`) are rejected.

### Integration / manual

- `npm run products` — prints the seeded catalog sorted `name asc`.
- `npm run products -- --sort price --order desc --search <term> --min-price 10 --max-price 50` — exercises combined filters/sorting.
- `npm run products -- --min-price 999999` — prints `No products match.` and exits `0`.
- `npm run products -- --html` — writes `./products.html`; open it to confirm a self-contained, escaped catalog; confirms the `Wrote N products to ./products.html` message.
- `npm run products -- --bogus` — prints usage + error, exits `1`.
- `npm run test:products` — prints `ALL PASS`, exits `0`.
- `npm run build` (→ `tsc --noEmit`) — type-checks cleanly.

## Documentation Updates

- **`README.md`:** Add a new "Product Listing" section (do **not** replace the existing Contact/Slack docs). Document: what the feature does (read-only listing, no Slack), how to run it (`npm run products`), every CLI flag with examples, the `--html` behavior and default path, the `scripts/products.json` schema (field types/constraints), the minor-units price convention, and the documented cross-currency price-filter caveat.

## Acceptance Criteria

- `scripts/products.ts`, `scripts/products.json`, and `scripts/test-products.ts` exist; the first and third type-check under strict `tsc --noEmit`.
- `scripts/products.ts` exports `loadProducts`, `validateProducts`, `ProductValidationError`, and the `Product` type, and defines a `main()` guarded by the direct-execution check so importing the module does not run the CLI.
- `npm run products` lists the seeded products to the console sorted `name asc`, with prices formatted as `NN.NN CUR`.
- `--sort name|price`, `--order asc|desc`, `--search`, `--min-price`, `--max-price` behave as specified; filters AND together; `min`/`max` convert via `Math.round(n * 100)` and compare on minor units inclusively.
- No matches prints exactly `No products match.` and exits `0`.
- `--html` (no value) writes `./products.html` and prints `Wrote N products to ./products.html`; `--html <path>` honors the override; the page is self-contained (inline CSS, no external assets) and HTML-escapes all values.
- Invalid/missing data causes `validateProducts()` to throw one `ProductValidationError` listing **every** issue; `main()` prints them and exits `1`.
- Unknown flags or invalid flag values print usage + a specific error and exit `1`.
- `package.json` contains `"products"` and `"test:products"` scripts; `npm run test:products` prints `ALL PASS` and exits `0` with no network access or env vars.
- `README.md` documents usage, all flags, and the JSON schema.
- No new runtime npm dependency is added; `SLACK_URL` is not referenced by the new code.

<details><summary><b>Implementation Detail</b></summary>

## Implementation Steps

### Phase 1 — Seed data: `scripts/products.json`

- Create a committed JSON array of several realistic, valid products exercising mixed currencies. Example shape:

  ```json
  [
    { "id": "sku-keyboard", "name": "Mechanical Keyboard", "price": 8999, "currency": "USD" },
    { "id": "sku-mouse",    "name": "Wireless Mouse",      "price": 2499, "currency": "USD" },
    { "id": "sku-lamp",     "name": "Desk Lamp",           "price": 1500, "currency": "EUR" },
    { "id": "sku-mug",      "name": "Ceramic Mug",         "price": 999,  "currency": "EUR" },
    { "id": "sku-notebook", "name": "A5 Notebook",         "price": 450,  "currency": "USD" }
  ]
  ```

- Keep every entry valid (non-empty unique `id`/`name`, integer `price ≥ 0`, 3-uppercase-letter `currency`) so the default `npm run products` output is meaningful and the happy-path test passes against real seed data.

### Phase 2 — Core module: `scripts/products.ts`

Follow the overall file shape of `scripts/contact.ts` (interface at top, error class, pure functions, `main()`, direct-execution guard at bottom).

1. **Types & error class** (mirror `scripts/contact.ts:1-15`):

   ```ts
   export interface Product {
     id: string;
     name: string;
     price: number;   // integer, minor units (1299 = 12.99)
     currency: string; // 3 uppercase letters, ISO-4217 format
   }

   export class ProductValidationError extends Error {
     issues: string[];
     constructor(issues: string[]) {
       super(`Invalid products data: ${issues.join("; ")}`);
       this.name = "ProductValidationError";
       this.issues = issues;
     }
   }
   ```

2. **`loadProducts(path?: string): Product[]`** — resolve the path relative to the module and read synchronously:

   ```ts
   import { readFileSync } from "node:fs";
   // ...
   export function loadProducts(path?: string): Product[] {
     const url = path ?? new URL("./products.json", import.meta.url);
     const raw = readFileSync(url, "utf8");
     const data: unknown = JSON.parse(raw);
     return validateProducts(data); // returns the typed array, or throws
   }
   ```

   Have `validateProducts()` return `Product[]` so `loadProducts` yields a typed value after narrowing from `unknown`.

3. **`validateProducts(data: unknown): Product[]`** — collect-all-then-throw, mirroring `validateContact()` at `scripts/contact.ts:19-32`:
   - If `data` is not an array → push `root is not an array` and throw immediately (cannot iterate).
   - For each entry (by index), check: entry is an object; `id` is a non-empty string; `name` is a non-empty string; `price` is an integer `≥ 0` (`Number.isInteger(price) && price >= 0`); `currency` matches `/^[A-Z]{3}$/`.
   - Track seen `id`s in a `Set`; push a `duplicate id` issue when a repeat is found.
   - Prefix each issue with the offending index and (when available) `id`, e.g. `product[2] (sku-lamp): price must be a non-negative integer`.
   - If `issues.length`, `throw new ProductValidationError(issues)`; otherwise return the array typed as `Product[]`.

4. **`formatPrice(p: Product): string`** — `return (p.price / 100).toFixed(2) + " " + p.currency;` (fixed 2-decimal exponent for all currencies).

5. **`filterProducts(products, opts)`** where `opts` has optional `search`, `minPrice`, `maxPrice` (minor units):
   - `search`: `p.name.toLowerCase().includes(search.toLowerCase())`.
   - `minPrice`: `p.price >= minPrice` (inclusive).
   - `maxPrice`: `p.price <= maxPrice` (inclusive).
   - AND all provided filters.

6. **`sortProducts(products, { sort, order })`** — copy the array before sorting (do not mutate input):
   - Primary key: `name` (case-insensitive compare via `localeCompare` on lowercased names) or `price` (numeric).
   - Tie-break: for `price`, fall back to case-insensitive `name`, then `id`; for `name`, fall back to `id`.
   - Apply `order` by negating the comparator result when `desc`.

7. **`renderHtml(products: Product[]): string`** — build a self-contained page:
   - Reuse an `esc()` helper identical to `scripts/contact.ts:36` (escape `&`, `<`, `>`).
   - Inline `<style>` only; no external assets.
   - `<title>Product Catalog</title>`; one table row per product with escaped `id`, escaped `name`, and `formatPrice(p)`.

8. **`parseArgs(argv: string[])`** — a small hand-rolled parser (no dependency):
   - Recognize `--sort`, `--order`, `--search`, `--min-price`, `--max-price`, `--html`.
   - `--sort` must be `name` or `price`; `--order` must be `asc` or `desc`; default `name`/`asc`.
   - `--min-price`/`--max-price`: parse as a decimal number; reject non-numeric or negative → invalid flag value. Convert to minor units via `Math.round(value * 100)`.
   - `--html`: optional value — if the next token is absent or itself a flag, treat as "no value" (→ `./products.html`); otherwise consume it as the path.
   - Any unrecognized `--flag` → unknown flag.
   - On any parse error, throw a typed error (or return a discriminated result) that `main()` turns into usage + error + exit `1`. Provide a `usage()` string listing all flags.

9. **`main()`** (shape from `scripts/contact.ts:89-112`):
   - `parseArgs(process.argv.slice(2))` inside try/catch → on error print `usage()` + message, `process.exit(1)`.
   - `loadProducts()` → `filterProducts()` → `sortProducts()`.
   - If `--html`: `writeFileSync(htmlPath, renderHtml(rows))`, print `Wrote ${rows.length} products to ${htmlPath}`, `process.exit(0)`.
   - Else console-list the rows; if `rows.length === 0`, print `No products match.` and `process.exit(0)`.
   - Catch `ProductValidationError` → print `Validation failed:` then each issue (as in `scripts/contact.ts:105-107`), `process.exit(1)`; other errors → generic message + `process.exit(1)`.

10. **Direct-execution guard** — copy verbatim from `scripts/contact.ts:116-118`:

    ```ts
    if (import.meta.url === `file://${process.argv[1]}`) {
      await main();
    }
    ```

### Phase 3 — Test: `scripts/test-products.ts`

- Mirror `scripts/test-contact.ts` structure (type-only import of `Product`, `PASS`/`FAIL`/`ALL PASS`, exit `0`/`1`) but **remove the `SLACK_URL` live-send dependency** — this test is fully offline.
- Import the pure functions and assert the behaviors listed under Testing Strategy. Construct in-memory `Product[]` fixtures (and a deliberately-invalid `unknown` fixture) rather than relying solely on `products.json`, so validation-failure cases are covered without corrupting the seed file.

### Phase 4 — Wiring & docs

- **`package.json`** (scripts block, `package.json:5-10`): add, alongside `contact`/`test:contact`:

  ```json
  "products": "tsx scripts/products.ts",
  "test:products": "tsx scripts/test-products.ts",
  ```

- **`README.md`:** add the new "Product Listing" section as described under Documentation Updates.

## Edge Cases

- **Empty catalog / all filtered out:** console prints `No products match.`, exit `0`; `--html` writes a page with zero rows and prints `Wrote 0 products to <path>`.
- **`--min-price` > `--max-price`:** yields an empty result (valid, no special error).
- **Non-numeric / negative `--min-price`/`--max-price`:** invalid flag value → usage + error, exit `1`.
- **`--html` as the last token with no following value:** treated as no-value → `./products.html`.
- **`--html --sort name` (next token is a flag):** `--html` takes no value; `--sort` parses normally.
- **Price `0`:** valid (`price ≥ 0`); renders `0.00 CUR`.
- **Duplicate `id`s in JSON:** reported by `validateProducts()` as a distinct issue.
- **Root JSON not an array (e.g. object):** single `root is not an array` issue, thrown.
- **Values containing `&`/`<`/`>` in HTML:** escaped; must not break the page.

## Error Handling

- All data problems surface as one `ProductValidationError` with a complete `issues` list (never partial/first-only).
- All argument problems surface as usage text + a one-line error on `stderr`, exit `1`.
- File-read errors (missing/unreadable `products.json`) propagate to `main()`'s catch and print a generic error, exit `1`.

## Performance

- Catalog is a small committed file; synchronous read + in-memory filter/sort is appropriate. No streaming, pagination, or indexing needed (pagination is explicitly out of scope).

## Security

- No network, no secrets, no `SLACK_URL`. HTML output escapes all interpolated values and uses only inline CSS / no external assets, preventing injection via product data.

## Dependencies & Related Work

- Depends only on existing devDeps (`tsx`, `typescript`, `@types/node`) and Node built-ins (`node:fs`, `node:url`).
- Directly patterned on `scripts/contact.ts` / `scripts/test-contact.ts`; shares no runtime code with the Contact/Slack feature and does not modify it.
- `.gitignore` is left unchanged: the generated `./products.html` is an untracked build artifact. Flagged for human veto — add `products.html` to `.gitignore` only if an untracked artifact in the working tree is undesirable.

</details>
