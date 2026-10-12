# Add a Static Product List Page (`products.html`)

## Plan Summary

- **What / why:** Add an ecommerce-style product list page as a single, hand-written static HTML file, `products.html`, committed at the repository root and openable directly in a browser via `file://`. It satisfies the "add product list page ecommerce" request within this repo's headless, no-server, zero-dependency conventions.
- **Key decisions (confirmed):** Static HTML file only (no web server/framework) · listing/grid view only (no sorting, filtering, search, pagination, cart, or checkout) · **eight hardcoded sample products** embedded in the markup · **single self-contained file** with an inline `<style>` block (no separate CSS) · **text-only cards** (no images, no external assets) · fully offline-safe.
- **Most important file:** `products.html` (new, repo root) — the entire deliverable. Plus a short README section.
- **Priority / complexity:** Low complexity, purely additive. No TypeScript, no npm script, no test script, no build/typecheck impact.
- **Non-goals:** No changes to `scripts/contact.ts`, `scripts/test-contact.ts`, `package.json`, or `tsconfig.json`; no Slack integration; no product detail pages.

## Problem Statement

The request is to "Add a product list page ecommerce" for this repository (tracking name `product-list-page`, project `thabungm/testHubLaunch`). The repo today is a headless "Contact Us → Slack" feature: strict TypeScript modules under `scripts/`, run via `tsx`, with **zero runtime dependencies** and **no web UI or HTTP server** (stated explicitly in `README.md:6-8`). There is no web framework, no router, no product/catalog data, and no `Product` type anywhere — the only domain type is `ContactInput` (`scripts/contact.ts`).

A "product list page" for ecommerce normally implies a browsable web UI. Rather than introduce a server/framework (which the repo forbids via its zero-dependency convention), the chosen form is a **real, openable static HTML page** that needs no server and no dependencies. Product data is invented as hardcoded sample data because no data source exists.

#### Planning Context

**Key requirements (confirmed):**
- The "page" is a **static HTML file only** — a real, openable product list page in the browser. No web server, no framework, no new runtime dependencies.
- Scope is **listing/grid only**: display products with their fields in a grid. No sorting, filtering, search, pagination, cart, or checkout.
- Product data is **hardcoded sample/seed products inside the deliverable itself**. No JSON data file, no external API, no database.
- The file is a **hand-written, committed `products.html` at the repository root** — no TypeScript generator, no npm script, no test script. (This mirrors the "Add Simple Contact Page" static-HTML precedent, which shipped a hand-written `contact.html` at the repo root.)
- Styling is a **single self-contained `products.html` with an inline `<style>` block**. No separate CSS file.
- **No product images.** Cards are text-only: name, description, price, category, and stock status. No external assets, fully offline-safe.
- Each product has: `id`, `name`, `description`, `price` (USD, two decimals), `category`, and `inStock` (rendered as an "Out of stock" badge when `false`). **Eight** hardcoded sample products.

**Decisions made (with rationale):**
- **Static HTML, not a server (Q1 → B).** The repo explicitly has "no web UI or HTTP server" (`README.md:6-8`) and zero runtime dependencies (`package.json`). A standalone HTML file delivers a genuinely openable page while honoring those constraints. A full self-contained file (inline CSS, no assets) is chosen over `html+css` split (Q5 → A) so the page is trivial to open and move.
- **Listing only (Q2 → A).** Keeps surface area minimal and matches "product **list** page." Interactive browse aids / cart are explicitly out of scope.
- **Hardcoded data (Q3 → A).** No database, catalog, or API exists; inventing one is out of scope. Eight sample products (Q7 → A) give a representative grid, including at least one out-of-stock item to exercise the badge.
- **Hand-written file, no TS generator (Q4 → A).** A generator (`scripts/products.ts`) would add a `.ts` file, an npm script, and a test — contradicting the "static HTML file only" answer. A hand-written file keeps `npm run typecheck` and the existing scripts completely untouched.
- **Text-only cards (Q6 → A).** The repo convention for HTML output is "no external assets"; omitting images keeps the page fully offline-safe with no network requests.

**Out of scope:**
- Any web server, framework (Express/Next/Vite), bundler, or routing.
- Sorting, filtering, search, pagination, cart, checkout, product detail pages.
- Product images or any external asset (fonts, CSS, JS, image URLs).
- A `Product` TypeScript type, a `scripts/products.ts` generator, a `scripts/test-products.ts`, or any new `npm run` script.
- Slack integration (the repo's Slack wiring belongs to Contact Us only).
- Changes to `scripts/contact.ts`, `scripts/test-contact.ts`, `package.json`, `tsconfig.json`, `scripts/build.mjs`.

**Repo drift note:** The context `Repo Snapshot` was commit `5297643` on `main`. The current checkout is commit `1c36676` on branch `product-list-page`. Two earlier product-list-page plan drafts already exist under `.hublaunch/plans/features/` (`2026-10-12-17:21-...` and `2026-10-12-17:41-...`); this plan supersedes them. Also note: the `contact.html`/`contact.css` precedent referenced in the clarifying questions lived on another branch (`fix-3`) and is **not** present at the current checkout — this does not affect the plan, since the deliverable is purely additive and self-contained.

## Detailed Requirements

### Functional
- A new file `products.html` exists at the repository root and opens directly in a browser (double-click / `file://`) with no server.
- The page renders a responsive grid of **eight** product cards from data embedded directly in the HTML markup.
- Each card displays, from a product with fields `{ id, name, description, price, category, inStock }`:
  - `name` as the card heading.
  - `description` as short body text.
  - `price` formatted as USD with exactly two decimals, e.g. `$49.99`.
  - `category` as a small label/tag.
  - An **"Out of stock"** badge when `inStock` is `false`; nothing stock-related shown when `true`.
  - `id` present as a `data-id` attribute on the card element (not visible to the user).
- A visible page title/heading identifying it as a product list / catalog.

### Technical
- Single self-contained `products.html`: HTML5 doctype, `<html lang="en">`, `<meta charset>`, and `<meta name="viewport" content="width=device-width, initial-scale=1">`.
- All styling in one inline `<style>` block in `<head>`. No separate CSS file, no `<link>` to external stylesheets, no web fonts.
- No `<img>`, no external asset references, no `<script>`, no network requests of any kind. Fully offline-safe.
- Semantic structure: a `<main>` wrapper, a `<section>` (or `<ul>`) holding the grid, and one `<article>` (or `<li>`) per product card.
- Responsive grid via CSS (e.g. `display: grid` with `grid-template-columns: repeat(auto-fill, minmax(…, 1fr))`) that reflows from multi-column on desktop to a single column on narrow/phone widths.

### Non-Functional
- Valid HTML5; no browser console errors or warnings when opened.
- Readable, accessible contrast; the "Out of stock" badge is visually distinct.
- File is self-documenting and easy to hand-edit (clean indentation, consistent card markup).

## Proposed Solution

Write one hand-authored `products.html` at the repo root. The `<head>` carries the charset/viewport meta and a single inline `<style>` block. The `<body>` has a header with the page title, then a `<main>` containing a grid `<section>` with eight `<article class="card" data-id="…">` elements, one per product. Each card is plain markup with the product's fields baked in (prices pre-formatted as `$NN.NN`; the out-of-stock badge present only on the relevant cards). CSS lives entirely in the inline `<style>` block and uses a responsive `grid` layout. No JavaScript, no external resources.

Because the deliverable is a single static file at the repo root, nothing in the TypeScript toolchain is touched: `tsconfig.json` only includes `scripts/**/*.ts`, so adding a root-level `.html` has no effect on `npm run typecheck`. Finally, add a short README section documenting the new file and how to open it.

<details><summary><b>Implementation Detail</b></summary>

### Implementation Steps

**Phase 1 — Author `products.html` (repo root)**
1. Create `/products.html` with the HTML5 skeleton:
   - `<!DOCTYPE html>`, `<html lang="en">`, `<head>` with `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, and a `<title>` such as `Products — Catalog`.
2. Add the inline `<style>` block in `<head>` (see **CSS sketch** below): base typography, page header, responsive grid, card, price, category tag, and out-of-stock badge styles.
3. Build the `<body>`:
   - A `<header>` with an `<h1>` page title (e.g. "Products") and optional subtitle.
   - A `<main>` containing a grid container `<section class="grid" aria-label="Product list">`.
   - Eight `<article class="card" data-id="…">` cards, each with `<h2>` name, `<p class="desc">` description, a `<p class="price">$NN.NN</p>`, a `<span class="category">…</span>` tag, and — only when out of stock — a `<span class="badge badge--oos">Out of stock</span>`.

**Phase 2 — Sample data (embedded in markup)**
4. Hand-write eight products directly into the cards. Suggested seed set (planner-chosen; adjust copy freely, keep the field set and formatting):

   | id | name | category | price | inStock |
   |----|------|----------|-------|---------|
   | p-001 | Aurora Desk Lamp | Lighting | $49.99 | true |
   | p-002 | Nimbus Wireless Headphones | Audio | $129.00 | true |
   | p-003 | Terra Ceramic Mug | Kitchen | $14.50 | true |
   | p-004 | Vertex Mechanical Keyboard | Accessories | $89.99 | false |
   | p-005 | Pulse Fitness Tracker | Wearables | $59.95 | true |
   | p-006 | Haven Linen Throw | Home | $39.00 | false |
   | p-007 | Cobalt Water Bottle | Outdoors | $24.99 | true |
   | p-008 | Lumen Portable Charger | Accessories | $34.95 | true |

   - Ensure at least two products are out of stock (above: `p-004`, `p-006`) so the badge path is exercised.
   - Prices are written pre-formatted with two decimals (e.g. `$39.00`, not `$39`).
   - Give each a one-line `description`.

**Phase 3 — Documentation**
5. Add a short section to `README.md` (e.g. after the existing Usage/Notes content) titled something like `## Product list page (`products.html`)` noting that `products.html` is a standalone static page and can be opened directly in a browser (double-click or `open products.html` / `file://` path) with no server and no build step.

**Phase 4 — Verify**
6. Open `products.html` in a browser; confirm the grid renders, prices show two decimals, the out-of-stock badge appears only on `p-004`/`p-006`, and there are **no console errors and no network requests** (check DevTools Network tab is empty). Resize to a narrow width to confirm the grid reflows to a single column.
7. Run `npm run typecheck` to confirm the TypeScript toolchain is unaffected (it should pass exactly as before, since no `.ts` changed).

### CSS sketch (inline `<style>` — illustrative, not prescriptive)

```html
<style>
  :root { --gap: 1rem; --radius: 10px; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
         color: #1a1a1a; background: #f7f7f8; }
  header { padding: 1.5rem; border-bottom: 1px solid #e2e2e5; }
  h1 { margin: 0; font-size: 1.5rem; }
  main { padding: 1.5rem; max-width: 1100px; margin: 0 auto; }
  .grid { display: grid; gap: var(--gap);
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); list-style: none; padding: 0; }
  .card { background: #fff; border: 1px solid #e2e2e5; border-radius: var(--radius);
          padding: 1rem; display: flex; flex-direction: column; gap: .5rem; }
  .card h2 { margin: 0; font-size: 1.1rem; }
  .desc { margin: 0; color: #555; font-size: .9rem; }
  .price { margin: 0; font-weight: 700; font-size: 1.1rem; }
  .category { align-self: flex-start; font-size: .75rem; padding: .15rem .5rem;
              background: #eef; border-radius: 999px; color: #334; }
  .badge--oos { align-self: flex-start; font-size: .75rem; padding: .15rem .5rem;
                background: #fdecec; color: #b00020; border-radius: 999px; font-weight: 600; }
  @media (max-width: 480px) { .grid { grid-template-columns: 1fr; } }
</style>
```

### Card markup sketch (illustrative)

```html
<article class="card" data-id="p-004">
  <span class="category">Accessories</span>
  <h2>Vertex Mechanical Keyboard</h2>
  <p class="desc">Hot-swappable switches with a compact 75% layout.</p>
  <p class="price">$89.99</p>
  <span class="badge badge--oos">Out of stock</span>
</article>
```

### Edge Cases
- **Out-of-stock rendering:** the badge element is simply omitted from in-stock cards; there is no "In stock" label.
- **Price formatting:** always two decimals, including whole-dollar values (`$89.00`). Written literally in the markup since data is static.
- **Narrow viewports:** grid must collapse to one column; verify no horizontal scroll on phone widths.
- **Offline:** opening via `file://` with no network must render identically — no fonts, images, or scripts to fail to load.
- **HTML escaping:** sample copy is author-controlled, so no dynamic escaping is needed; avoid raw `<`, `>`, `&` in descriptions or escape them (`&amp;`).

### Technical Considerations
- **Dependencies:** none added. No `package.json` change.
- **Config:** none. `tsconfig.json` `include` is `scripts/**/*.ts`; a root `.html` is outside it, so `tsc --noEmit` is unaffected.
- **Build:** `scripts/build.mjs` is `tsc --noEmit` and does not touch HTML; no build step produces or needs `products.html`.
- **Security:** static, self-contained, no scripts, no external resources, no user input — no injection or network surface. No secrets involved (unlike the Slack feature's `SLACK_URL`).
- **Compatibility:** CSS used (grid, flexbox, custom properties, `minmax`) is supported by all current evergreen browsers.

### Testing Strategy
- **Unit / automated:** none applicable — there is no TypeScript and no runtime logic. Deliberately no `scripts/test-products.ts` (per the confirmed "no test script" decision).
- **Toolchain regression:** `npm run typecheck` must still pass unchanged (sanity check that nothing in `scripts/` was disturbed).
- **Manual:**
  - Open `products.html` in a browser; confirm eight cards render in a grid.
  - Confirm each card shows name, description, `$NN.NN` price, category tag.
  - Confirm the "Out of stock" badge appears only on the out-of-stock products and nowhere else.
  - Confirm `data-id` is present on each `<article>` (via DevTools) and not visually rendered.
  - Open DevTools → Network: confirm **zero** requests after load.
  - Open DevTools → Console: confirm **no** errors/warnings.
  - Resize to ~375px wide: confirm single-column reflow and no horizontal overflow.

### Documentation Updates
- `README.md`: add a short section describing `products.html` — that it is a standalone static product list page, how to open it (double-click or `file://`), and that it needs no server, build, or dependencies.

### Acceptance Criteria
- [ ] `products.html` exists at the repository root and is valid HTML5 (doctype, `lang`, charset, viewport meta).
- [ ] Opening the file in a browser with no network renders a responsive grid of exactly **eight** product cards.
- [ ] Each card shows name, description, a USD price with two decimals, and a category tag.
- [ ] The "Out of stock" badge appears only on products with `inStock: false` and is absent on in-stock products.
- [ ] Each card carries a `data-id` attribute matching its product `id`, not shown to the user.
- [ ] All styling is in a single inline `<style>` block; there is no separate CSS file, no `<link>`/`<script>`/`<img>`, and no external asset or network request.
- [ ] The grid reflows to a single column at phone widths with no horizontal scrolling.
- [ ] No browser console errors when the page is opened.
- [ ] `README.md` documents the new page.
- [ ] `npm run typecheck` passes and `scripts/contact.ts`, `scripts/test-contact.ts`, `package.json`, and `tsconfig.json` are unchanged.

### Dependencies & Related Work
- **Precedent — repo "page" convention:** `.hublaunch/plans/features/2026-07-17-19:54-slack-health-page.md` (a prior "page" request delivered as a headless render target / optional static HTML, no server).
- **Precedent — static HTML page:** the "Add Simple Contact Page" work shipped a hand-written static page at the repo root (on branch `fix-3`); this plan follows that hand-written-file shape but as a single self-contained file with inline styles.
- **Untouched modules:** `scripts/contact.ts`, `scripts/test-contact.ts` (the existing Contact Us → Slack feature) remain the repo's only TypeScript feature; this work does not interact with them.

</details>
