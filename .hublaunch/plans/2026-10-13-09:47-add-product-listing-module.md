# Add a Headless Product-Listing Module for an Ecommerce Sample Catalog

## Plan Summary

- **What / why:** Add a self-contained, headless TypeScript product-listing capability (`scripts/products.ts`) backed by a hardcoded sample catalog, exposing a `listProducts()` query API with category filtering and price/name sorting. The repo has no product model, catalog data, or listing surface today, so this is built from scratch.
- **Key decisions:** Headless TS module (no UI, no server, no DB), mirroring the existing `scripts/contact.ts` shape (exported types → validation → query → `import.meta.url` run guard). Data is a hardcoded in-source `PRODUCTS` array. Price is stored as **integer minor units** with a separate currency code and a `formatPrice()` helper. Invalid query options throw a typed `ProductQueryValidationError` mirroring `ContactValidationError`. No Slack / `SLACK_URL` involvement.
- **Most important files:** `scripts/products.ts` (new module), `scripts/test-products.ts` (new PASS/FAIL runner), `package.json` (two new `npm run` entries), `README.md` (docs).
- **Priority / complexity:** Low complexity, self-contained, no new runtime dependencies; a focused single-session change plus a paired test script.

## Problem Statement

The repository currently has exactly one real feature — a headless Slack contact-form module (`scripts/contact.ts`) with a paired live-test runner (`scripts/test-contact.ts`). There is **no product model, no catalog data, and no surface (page, API, or function) on which to list anything**. A grep for `product|ecommerce|catalog|cart|sku|price|inventory` over application sources returns no feature code. There is no web server, HTTP/frontend framework, database, ORM, or data file; `package.json` has zero runtime dependencies.

The request — "add product listing for ecommerce" — therefore means introducing, from scratch, a way to represent a set of products and return them as a browsable/queryable list. Delivered as a headless module, this fits the repo's established pattern without introducing a new web/server/DB stack.

#### Planning Context

**Key requirements (confirmed):**
- Delivery form: a **headless TypeScript module** under `scripts/` mirroring `scripts/contact.ts` — exported `Product` type, `listProducts()` query function(s), and a paired standalone PASS/FAIL test. No UI, no server, no web framework.
- Data source: a **hardcoded sample catalog array** defined in the TypeScript source. No JSON file, no database, no external API.
- Product shape: **Standard** — `id`, `name`, `description`, `price`, `currency`, `category`, `imageUrl`, `inStock`. No SKU, ratings, tags, discounts, or stock counts.
- Listing capabilities: return the full catalog, **filter by category**, and **sort by price or name**. No pagination, no text search.
- Price representation: **integer minor units** (e.g. `1999` = $19.99) stored alongside a separate `currency` code; a `formatPrice()` helper renders the display string.
- Sort behaviour: `sortBy: 'price' | 'name'` plus `sortDirection: 'asc' | 'desc'` (default `asc`). No `sortBy` means catalog order is preserved.
- Invalid query options: throw a typed `ProductQueryValidationError` (extends `Error`, holds `issues: string[]`) mirroring `ContactValidationError` at `scripts/contact.ts:8`.
- CLI / direct-run entry: `npm run products -- --category <name> --sort price|name --direction asc|desc` parses `process.argv`, calls `listProducts`, and prints the resulting list as JSON. No flags prints the full catalog.

**Decisions made (with rationale):**
- **Headless module, not a page/server/framework (Q1 → A).** Both a headless TS module and a static HTML page are accepted precedents in this repo's history; the module path was chosen so the feature is covered by `tsconfig`/`typecheck` and matches the single existing real feature (`contact.ts`) without a new stack.
- **Hardcoded in-source array, not JSON/DB/API (Q2 → A).** There is no persistence layer or catalog API, and no credentials/config for one; an in-source array keeps the feature self-contained and network-free.
- **Integer minor units for price (Q6 → A).** Avoids floating-point rounding issues in sort/compare and in display; `formatPrice()` centralizes rendering.
- **Typed validation error (Q8 → A).** Mirrors the repo's established `ContactValidationError` pattern so the public API is consistent and testable.

**Out of scope:**
- No UI, no HTML page, no HTTP server, no web/frontend framework, no database.
- No pagination, no text/keyword search, no `inStock` filter (backlogged).
- No cart, checkout, payments, user accounts, or inventory mutation.
- No Slack integration and no use of `SLACK_URL`.
- No new runtime dependencies and no new test framework.
- No SKU, ratings/reviews, tags, discount/sale price, or stock-count fields.

## Detailed Requirements

### Functional
- Export a `Product` interface with exactly: `id: string`, `name: string`, `description: string`, `price: number` (integer minor units), `currency: string` (ISO code, e.g. `"USD"`), `category: string`, `imageUrl: string`, `inStock: boolean`.
- Provide a hardcoded `PRODUCTS` catalog: ~8–12 products across 3–4 categories, mixed `inStock` values, all `currency: "USD"`.
- Export `listProducts(options?: ListProductsOptions): Product[]`:
  - No options → returns the full catalog in catalog (source) order.
  - `category` → case-insensitive **exact** match; no match returns an empty array.
  - `sortBy: 'price' | 'name'` with `sortDirection: 'asc' | 'desc'` (default `'asc'`).
  - No `sortBy` → catalog order preserved (filtering still applies).
  - Always returns a **copy**; never returns or mutates the internal catalog array.
- Export `formatPrice(product: Product): string` → renders minor units + currency as a display string (e.g. `"$19.99"` for USD; fall back to `"<amount> <currency>"` for non-USD currencies).
- Export `validateListProductsOptions(options: ListProductsOptions): void` → collects issues and throws `ProductQueryValidationError` when any are present.
- Export `ProductQueryValidationError extends Error` holding `issues: string[]`.
- Direct-run `main()` behind an `import.meta.url` guard: parse `--category`, `--sort`, `--direction` from `process.argv`, call `listProducts`, print the JSON array to stdout, exit 0. On validation failure, print issues to stderr and exit 1.

### Technical
- Language/runtime: TypeScript executed via **`tsx`** (sandbox Node is v20, which does not natively strip TS types — do **not** rely on `node scripts/*.ts`).
- File location: under `scripts/` so `tsconfig.json` `"include": ["scripts/**/*.ts"]` (`tsconfig.json:14`) covers it and `npm run typecheck` / `npm run build` type-check it.
- Conventions: `strict`, ESM (`"type": "module"`), `verbatimModuleSyntax` (use `import type` for type-only imports as in `scripts/test-contact.ts:1-6`), keep `.ts` extensions on relative imports (`allowImportingTsExtensions`, `tsconfig.json:6`).
- No new dependencies in `package.json`; use only built-ins and global APIs.

### Non-Functional
- `npm run typecheck` passes with no errors.
- `npm run test:products` prints per-check `PASS`/`FAIL`, a final `ALL PASS`, and exits `0` on success / `1` on any failure — no network required.
- Code style, naming, and structure match `scripts/contact.ts` for reviewer familiarity.

## Proposed Solution

Create a new headless module `scripts/products.ts` that follows the exact structural shape of `scripts/contact.ts`: **types → typed validation error → validation function → core action → direct-run guard with `main()`**. The catalog is a module-level constant; `listProducts()` filters/sorts a copy of it. A paired `scripts/test-products.ts` exercises the public API offline, printing `PASS`/`FAIL`. Two `npm run` entries are added, and `README.md` documents the feature in the existing style.

```
scripts/products.ts
  ┌─────────────────────────────────────────────┐
  │ interface Product                            │
  │ interface ListProductsOptions                │
  │ class ProductQueryValidationError extends Err│
  │ const PRODUCTS: Product[]   (hardcoded)      │
  │ validateListProductsOptions(opts): void      │
  │ listProducts(opts?): Product[]  ── copy ──▶  │ ◀── returns filtered/sorted copy
  │ formatPrice(product): string                 │
  │ main() behind import.meta.url guard (CLI)    │
  └─────────────────────────────────────────────┘
          ▲ imported by
scripts/test-products.ts  (PASS/FAIL runner, no network)
package.json  → "products", "test:products"
README.md     → feature docs
```

## Implementation Steps

### Phase 1 — Create the product module (`scripts/products.ts`)
Follow the ordering and idioms of `scripts/contact.ts`.

1. Define and export `interface Product` with the Standard fields (see Detailed Requirements). Add a short comment on `price` noting it is integer minor units (mirror the inline comment style at `scripts/contact.ts:35`).
2. Define and export `interface ListProductsOptions { category?: string; sortBy?: 'price' | 'name'; sortDirection?: 'asc' | 'desc'; }`.
3. Define and export `class ProductQueryValidationError extends Error` with an `issues: string[]` field — copy the shape of `ContactValidationError` at `scripts/contact.ts:8-15` (set `this.name`, build a `super(...)` message joining issues with `"; "`).
4. Define a module-level `const PRODUCTS: Product[]` with ~8–12 entries across 3–4 categories (e.g. `"Electronics"`, `"Books"`, `"Home"`, `"Apparel"`), mixed `inStock`, all `currency: "USD"`, realistic `price` minor-unit values, and placeholder `imageUrl` strings (e.g. `https://example.com/img/<id>.jpg`).
5. Export `validateListProductsOptions(options: ListProductsOptions): void` that collects `issues: string[]` (pattern of `validateContact` at `scripts/contact.ts:19-33`):
   - If `category` is present and is not a non-empty string after `.trim()`, push `"category must be a non-empty string"`.
   - If `sortBy` is present and not one of `'price' | 'name'`, push `"sortBy must be 'price' or 'name'"`.
   - If `sortDirection` is present and not one of `'asc' | 'desc'`, push `"sortDirection must be 'asc' or 'desc'"`.
   - If `issues.length`, `throw new ProductQueryValidationError(issues)`.
6. Export `listProducts(options: ListProductsOptions = {}): Product[]`:
   - Call `validateListProductsOptions(options)` first.
   - Start from a copy: `let result = [...PRODUCTS];`.
   - If `options.category`, filter case-insensitively: `p.category.toLowerCase() === options.category.trim().toLowerCase()`.
   - If `options.sortBy`, sort the copy; compute `const dir = options.sortDirection === 'desc' ? -1 : 1;`. For `'price'` compare numerically (`(a.price - b.price) * dir`); for `'name'` use `a.name.localeCompare(b.name) * dir`. Sort on the copy only (never mutate `PRODUCTS`).
   - Return `result`.
7. Export `formatPrice(product: Product): string`: convert minor units to major (`product.price / 100`) with two decimals; for `"USD"` prefix `"$"` (e.g. `"$19.99"`), otherwise render `"<amount> <currency>"` (e.g. `"19.99 EUR"`).
8. Implement `async function main(): Promise<void>` and the run guard `if (import.meta.url === \`file://${process.argv[1]}\`) { await main(); }` — copy the guard verbatim from `scripts/contact.ts:116-118`. In `main()`:
   - Parse `--category <name>`, `--sort price|name`, `--direction asc|desc` from `process.argv.slice(2)` (simple positional scan; a flag's value is the next argv token).
   - Build a `ListProductsOptions` object (only set keys that were provided).
   - `try { const list = listProducts(opts); console.log(JSON.stringify(list, null, 2)); process.exit(0); }`.
   - `catch (err)`: if `err instanceof ProductQueryValidationError`, print `"Validation failed:"` then each issue to stderr; else print the error message; `process.exit(1)`. Mirror the catch block at `scripts/contact.ts:104-112`.

### Phase 2 — Create the test runner (`scripts/test-products.ts`)
Model on `scripts/test-contact.ts` (standalone script, no framework, `PASS`/`FAIL` + exit code). Use `import type` for type-only imports per `verbatimModuleSyntax` (as at `scripts/test-contact.ts:1-6`). No network required.

9. Import the public API from `./products.ts`: `listProducts`, `formatPrice`, `validateListProductsOptions` (or rely on `listProducts` throwing), `ProductQueryValidationError`, and `type Product` / `type ListProductsOptions`.
10. Write an `async function run()` (or sync) that performs the checks below, printing `PASS (...)`/`FAIL (...)`, calling `process.exit(1)` on first failure, and ending with `console.log("ALL PASS"); process.exit(0);` — mirror `scripts/test-contact.ts:8-49`.

### Phase 3 — Wire up scripts (`package.json`)
11. Add to the `"scripts"` block (alongside `"contact"`/`"test:contact"` at `package.json:6-7`):
    - `"products": "tsx scripts/products.ts"`
    - `"test:products": "tsx scripts/test-products.ts"`

### Phase 4 — Documentation (`README.md`)
12. Add a "Product Listing" section in the same style as the existing contact documentation: describe the `Product` shape, the `listProducts()` options (category filter, price/name sort with direction), the minor-units price convention + `formatPrice()`, the CLI usage (`npm run products -- --category Electronics --sort price --direction desc`), and how to run the test (`npm run test:products`). Note there are no runtime dependencies and no network calls.

<details><summary><b>Implementation Detail</b></summary>

### Edge Cases
- **Empty category match:** a `category` that matches nothing returns `[]` (not an error).
- **Whitespace-only category:** `"   "` is invalid → `ProductQueryValidationError` with `"category must be a non-empty string"`.
- **Case-insensitive category:** `"electronics"`, `"ELECTRONICS"`, and `"Electronics"` all match the `"Electronics"` category.
- **No options / empty object:** returns the full catalog in source order.
- **`sortDirection` without `sortBy`:** direction is harmless/ignored (no sort applied) — catalog order preserved. Do not treat a lone `sortDirection` as an error.
- **Stable/catalog order:** when no `sortBy`, preserve source order (do not call `.sort()`).
- **Immutability:** `listProducts` must never mutate `PRODUCTS`; always operate on a copy (`[...PRODUCTS]`). A test asserts the returned array is a different reference and that mutating it does not change later results.
- **Non-USD currency in `formatPrice`:** fall back to `"<amount> <currency>"` so the helper never throws on unknown currencies (sample data is all USD, but keep it robust).
- **Price formatting:** `1999 / 100` → `"19.99"`; use `(price / 100).toFixed(2)` to guarantee two decimals (e.g. `500` → `"5.00"`).
- **CLI flag without a value:** e.g. `--category` as the last token → treat the missing value as absent (or as empty, which then fails validation and prints issues to stderr with exit 1); do not crash with an unhandled exception.

### Error Handling
- All invalid-option paths funnel through `validateListProductsOptions`, which throws `ProductQueryValidationError` carrying an `issues: string[]` array — identical contract to `ContactValidationError` (`scripts/contact.ts:8-15`).
- `main()` distinguishes `ProductQueryValidationError` (print issues) from other errors (print message), exiting `1` either way — mirror `scripts/contact.ts:104-112`.

### Security
- No network, no secrets, no user-supplied persistence — attack surface is minimal.
- CLI input (`process.argv`) is validated before use; unknown `sortBy`/`sortDirection` values are rejected rather than silently coerced.
- `imageUrl` values are static placeholders in sample data; no URL is fetched or rendered, so no SSRF/XSS surface is introduced.

### Performance
- Catalog is ~8–12 items in memory; filter + sort are trivially cheap. No pagination needed at this scale.
- Copy-on-read (`[...PRODUCTS]`) is negligible overhead and guarantees immutability.

### Testing Strategy

**Unit-style checks (in `scripts/test-products.ts`, offline, `PASS`/`FAIL` + exit code):**
- Full list: `listProducts()` length equals `PRODUCTS.length`.
- Copy semantics: returned array is a distinct reference from `PRODUCTS`; mutating the result does not affect a subsequent `listProducts()` call.
- Category filter: case-insensitive match returns only that category; a non-matching category returns `[]`.
- Sort by price `asc` and `desc`: result ordering is monotonic by `price`.
- Sort by name `asc` and `desc`: result ordering matches `localeCompare` direction.
- Default order: no `sortBy` preserves catalog/source order.
- Validation: bad `sortBy`, bad `sortDirection`, and empty/whitespace `category` each throw `ProductQueryValidationError` (assert `instanceof` and non-empty `issues`).
- `formatPrice`: `1999` USD → `"$19.99"`; a `500` USD product → `"$5.00"`.

**Integration / type checks:**
- `npm run typecheck` (`tsc --noEmit`) passes.
- `npm run build` (`node scripts/build.mjs`) passes (it runs `tsc --noEmit`).

**Manual:**
- `npm run products` prints the full catalog JSON.
- `npm run products -- --category Electronics --sort price --direction desc` prints only Electronics, price-descending.
- `npm run products -- --sort bogus` prints validation issues to stderr and exits non-zero.

### Documentation Updates
- `README.md`: new "Product Listing" section (see Phase 4) — `Product` shape, query options, minor-units/`formatPrice` convention, CLI examples, test command, and a "no runtime dependencies / no network" note consistent with the contact feature's documentation style.

### Acceptance Criteria
- [ ] `scripts/products.ts` exists and exports `Product`, `ListProductsOptions`, `ProductQueryValidationError`, `listProducts`, `formatPrice`, and `validateListProductsOptions`.
- [ ] `Product` has exactly the Standard fields: `id`, `name`, `description`, `price`, `currency`, `category`, `imageUrl`, `inStock`.
- [ ] `PRODUCTS` contains ~8–12 items across 3–4 categories with mixed `inStock`, all USD, prices in integer minor units.
- [ ] `listProducts()` returns a copy; `listProducts({ category })` matches case-insensitively and returns `[]` on no match; `sortBy`/`sortDirection` sort correctly with `asc` default; no `sortBy` preserves catalog order.
- [ ] Invalid `sortBy`, invalid `sortDirection`, or empty/whitespace `category` throws `ProductQueryValidationError` with a non-empty `issues` array.
- [ ] `formatPrice` renders `1999` USD as `"$19.99"`.
- [ ] `npm run products` prints the full catalog JSON; `npm run products -- --category <name> --sort price|name --direction asc|desc` prints the filtered/sorted JSON; a bad flag exits non-zero with issues on stderr.
- [ ] `scripts/test-products.ts` runs offline, prints `ALL PASS`, and exits `0`; it exits `1` on any failure.
- [ ] `package.json` has `"products"` and `"test:products"` scripts; no new dependencies added.
- [ ] `npm run typecheck` and `npm run build` pass.
- [ ] `README.md` documents the feature in the existing style.

### Dependencies & Related Work
- **Pattern source — headless module:** `scripts/contact.ts` (types → validation error at `:8` → `validateContact` at `:19` → action → run guard at `:116-118`).
- **Pattern source — test runner:** `scripts/test-contact.ts:1-51` (`import type` usage at `:1-6`, `PASS`/`FAIL` + exit at `:47-48`).
- **Build/typecheck:** `scripts/build.mjs` runs `tsc --noEmit`; `tsconfig.json:14` `"include": ["scripts/**/*.ts"]` scopes type-checking to `scripts/`.
- **Scripts wiring:** `package.json:5-10` (`"contact"`, `"test:contact"` as siblings for the new entries).
- **No related runtime deps:** `package.json` has an empty `dependencies` set; the feature must not add any.
- **Repo drift check:** plan authored against commit `5297643d1b8a9d0f070a4f70cf5d80153b66bd32`, which matches the Repo Snapshot — no drift.

</details>
