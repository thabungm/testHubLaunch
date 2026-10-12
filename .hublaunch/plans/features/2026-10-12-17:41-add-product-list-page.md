# Add a Static Product List Page (`products.html`)

## Plan Summary

- **What/why:** Add a single hand-written static HTML file, `products.html`, at the repository root that displays an ecommerce product catalog as a responsive card grid, openable directly in a browser via `file://`. It gives the repo a browsable "product list page" with zero infrastructure.
- **Key decision:** Follow the repo's **static-HTML page** precedent (the "Add Simple Contact Page" / `contact.html` approach) rather than the TypeScript feature-module convention. No TypeScript generator, no npm script, no test script, no server, no framework, **no new dependencies**.
- **Scope:** Listing/grid **only** — eight hardcoded sample products with `id`, `name`, `description`, `price` (USD, two decimals), `category`, and `inStock`. No sorting, filtering, search, pagination, cart, checkout, detail pages, or images.
- **Most important file:** `products.html` (new, repo root). Styling lives in a single inline `<style>` block; the page is fully self-contained and offline-safe (no external CSS, fonts, images, or scripts).
- **Priority/complexity:** Low complexity, purely additive. The only quality gates are valid HTML5 and correct rendering at phone and desktop widths. `npm run typecheck` is unaffected because no `.ts` file is added.

## Problem Statement

The repository (`thabungm/testHubLaunch`) currently contains a single headless feature — the "Contact Us → Slack" module (`scripts/contact.ts`) — and explicitly has "no web UI or HTTP server" (`README.md:6-7`). The request is to add a **product list page for an ecommerce context**: a page that displays a catalog of products in a listing/grid layout.

Because the repo has no web framework, HTTP server, or routing, and no product/catalog data or types of any kind, the "page" must be delivered as a self-contained artifact. The confirmed decision is to ship it as a **single hand-written static HTML file** that opens directly in a browser, mirroring the repo's prior static-page work (the "Add Simple Contact Page" effort that shipped a hand-written `contact.html`).

#### Planning Context

**Key requirements (confirmed):**
- The deliverable is exactly **one new file**: `products.html`, committed at the repository **root** (not under `scripts/`).
- Hand-written static HTML5, openable via `file://`. **No** TypeScript generator, **no** `npm run` script, **no** test script, **no** server, **no** framework, **no** new runtime dependencies.
- Content: a responsive **card grid** of **eight hardcoded sample products** embedded directly in the markup.
- Each product card shows:
  - `name` — as a heading.
  - `description` — short text.
  - `price` — USD with two decimals, e.g. `$49.99`.
  - `category` — a label/tag.
  - stock status — an **"Out of stock" badge when `inStock` is false**; nothing shown when `inStock` is true.
  - `id` — present as a `data-id` attribute on the card element; **not** visually displayed.
- Styling: a **single inline `<style>` block** in `<head>`. No external CSS, no web fonts, no images, no client-side scripts, no network requests. Fully offline-safe.

**Decisions made (with rationale):**
- **Static HTML file, not a TS module** (Q1=B, Q4=A). The repo forbids runtime dependencies and has no server; the "Add Simple Contact Page" work established a hand-written-HTML-at-root precedent. This is the lowest-friction way to deliver a real, openable page.
- **Inline `<style>`, no separate CSS** (Q5=A). A single self-contained file is simplest to open and move; it also removes any `file://` relative-path concerns.
- **Text-only cards, no images** (Q6=A). The repo convention for HTML output is "no external assets." Text-only cards keep the page fully offline-safe without inventing placeholder graphics.
- **Default field set, 8 products** (Q7=A). No `Product` type exists in the repo, so a sensible field set was chosen and confirmed.

**Out of scope:**
- Any web server or framework (Express/Next/Vite/`http.createServer`).
- Any TypeScript, npm script, or automated test for this feature.
- Sorting, filtering, search, pagination, cart, checkout, product detail pages.
- Product images or any external asset (CSS, fonts, JS, image URLs).
- Slack integration (the repo's Slack wiring is specific to Contact Us and is unrelated here).
- Any change to `scripts/contact.ts`, `scripts/test-contact.ts`, `package.json`, `tsconfig.json`, or the build/typecheck scripts.

## Detailed Requirements

### Functional
- Opening `products.html` in any modern browser (including via `file://`, double-clicking the file) renders a product list page titled appropriately (e.g. "Products").
- The page displays **exactly eight** product cards in a grid.
- Each card renders `name`, `description`, formatted `price`, and `category`.
- A card whose product is out of stock shows a clearly styled **"Out of stock"** badge; in-stock cards show no such badge.
- Each card element carries a `data-id` attribute equal to the product's `id`, and the `id` is **not** otherwise visible on the page.

### Technical
- Valid **HTML5**: `<!DOCTYPE html>`, `<html lang="en">`, `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, and a `<title>`.
- Semantic structure: a single `<main>` containing a `<section>` (the grid) whose children are `<article>` cards (one `<article>` per product).
- All styling in **one** `<style>` block inside `<head>`. No `<link rel="stylesheet">`, no `@import`, no web-font `@font-face` from a network, no `<script>`.
- No network requests of any kind when the page loads (verifiable: browser devtools Network tab shows zero requests; Console shows zero errors).
- Prices hardcoded already-formatted as `$NN.NN` strings (two decimals). Since there is no runtime code, formatting is done by hand in the markup.
- Any user-facing text containing `&`, `<`, or `>` must be written as HTML entities (`&amp;`, `&lt;`, `&gt;`) — relevant only if sample copy includes them; prefer sample data that avoids them.

### Non-Functional
- **Responsive:** readable single-column (or comfortably narrow) layout at phone widths (~360px) and a multi-column grid at desktop widths. Use CSS `grid` with `repeat(auto-fill, minmax(...))` so the layout adapts without media queries (a media query is acceptable but not required).
- **Offline-safe:** the file works with no internet connection and no sibling files.
- **Self-contained:** the file can be moved anywhere and still render identically.
- **Accessible-enough:** sufficient color contrast for text and the out-of-stock badge; headings used for product names.

## Proposed Solution

Create one file, `products.html`, at the repo root. It is a complete HTML5 document:

- `<head>` holds the meta tags, `<title>`, and a single `<style>` block defining the page background, a centered content column, a responsive CSS-grid of cards, card styling (border/shadow/padding/rounding), typography for name/description/price/category, and the "Out of stock" badge.
- `<body>` holds a short `<header>` (page title + optional one-line subtitle), then `<main>` → `<section class="grid">` containing eight `<article class="card" data-id="...">` elements. Each `<article>` contains the name heading, category tag, description, price, and — only for out-of-stock items — the badge.

No ASCII architecture diagram is warranted: this is a single self-contained file with no component boundaries or data flow.

The eight sample products should be a realistic spread across a couple of categories with at least one out-of-stock item so the badge is visibly exercised. Suggested seed set (planner-chosen; adjust copy freely as long as the field set and count hold):

| id | name | category | price | inStock |
|----|------|----------|-------|---------|
| `p-001` | Wireless Mouse | Electronics | `$24.99` | true |
| `p-002` | Mechanical Keyboard | Electronics | `$89.00` | true |
| `p-003` | USB-C Hub | Electronics | `$39.50` | false |
| `p-004` | Laptop Stand | Accessories | `$32.00` | true |
| `p-005` | Noise-Cancelling Headphones | Audio | `$149.99` | true |
| `p-006` | Desk Lamp | Home Office | `$27.49` | false |
| `p-007` | Webcam 1080p | Electronics | `$45.00` | true |
| `p-008` | Ergonomic Footrest | Accessories | `$19.99` | true |

<details><summary><b>Implementation Detail</b></summary>

### Implementation Steps

**Phase 1 — Create the HTML skeleton**
- Create `products.html` at the repository root (same location pattern the "Add Simple Contact Page" precedent used for `contact.html`; note that `contact.html` is not present in the current checkout — it lived on a separate branch — but the root-level placement convention is the one being followed here).
- Add `<!DOCTYPE html>`, `<html lang="en">`, `<head>` with `charset`, `viewport`, and `<title>Products</title>`.
- Add `<body>` with a `<header>` (page title, e.g. `<h1>Products</h1>`, and optional subtitle) and an empty `<main><section class="grid">…</section></main>`.

**Phase 2 — Add the inline styles**
- Inside `<head>`, add a single `<style>` block:
  - Base: `box-sizing: border-box`, body font stack (system fonts only, e.g. `font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif`), background color, body margin/padding, centered max-width container.
  - Grid: `.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }`.
  - Card: `.card { border: 1px solid #e2e2e2; border-radius: 10px; padding: 1rem; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.06); display: flex; flex-direction: column; gap: .5rem; }`.
  - Typography: name heading size/weight; `.category` as a small pill/tag; `.description` muted; `.price` bold/emphasized.
  - Badge: `.badge-oos { ... }` — a clearly visible "Out of stock" badge (e.g. red/muted background, small uppercase text).

**Phase 3 — Add the eight product cards**
- Under `<section class="grid">`, hand-write eight `<article class="card" data-id="p-001">…</article>` blocks using the seed data above (or equivalent).
- Card inner structure per product:
  ```html
  <article class="card" data-id="p-003">
    <h2 class="name">USB-C Hub</h2>
    <span class="category">Electronics</span>
    <p class="description">7-in-1 hub with HDMI, USB-A, and SD card slots.</p>
    <p class="price">$39.50</p>
    <span class="badge-oos">Out of stock</span>
  </article>
  ```
- Omit the `<span class="badge-oos">` entirely for in-stock products.

**Phase 4 — Documentation**
- Add a short README section (see Documentation Updates).

**Phase 5 — Verify**
- Open the file in a browser and run the manual checks in Testing Strategy.

### Edge Cases
- **Out-of-stock rendering:** ensure at least one product (e.g. `p-003`, `p-006`) is out of stock so the badge path is exercised; in-stock cards must show no badge (not an empty/hidden element — simply omit it).
- **`id` visibility:** `id` lives only in `data-id`; double-check it is not printed as card text.
- **Long descriptions / names:** keep sample copy short; cards use `flex-direction: column` so text wraps naturally without breaking the grid.
- **Narrow viewport:** at ~360px the `minmax(240px, 1fr)` grid collapses to a single column — confirm no horizontal scroll.
- **Special characters:** avoid `&`/`<`/`>` in sample copy, or escape them as entities.

### Performance
- Trivial — a single small static document with no scripts and no requests. No performance concerns.

### Security
- No user input, no network calls, no scripts, no secrets. No `SLACK_URL` or any environment variable involved. Nothing to secure beyond standard valid HTML.

### Observability
- Not applicable (static file, no logging/telemetry).

### Rollout / Backout
- Rollout: commit `products.html` (and the README edit). Backout: delete `products.html` and revert the README section. Nothing else references it.

### Dependencies & Related Work
- **No** new dependencies (runtime or dev). `package.json` and `package-lock.json` are untouched.
- **Precedent / related:**
  - Repo "page as static HTML" convention and the prior "page" feature plan: `.hublaunch/plans/features/2026-07-17-19:54-slack-health-page.md`.
  - Prior static-HTML page plans referenced in `.hublaunch/trackedPlans.json` ("Add Simple Contact Page", "Add Simple About Us Page"), which established hand-written HTML at the repo root.
  - The headless feature-module convention this plan deliberately does **not** follow: `scripts/contact.ts:116` (guarded `main()`), `scripts/test-contact.ts`, and the `npm run` registrations in `package.json`.
- **Repo drift note:** the Understanding was derived at commit `5297643`; the current checkout is at `b422e31` (the `product-list-page` branch plan commit, a descendant). No relevant source files changed; `contact.html` is not present in this checkout (it originated on a different branch) but that does not affect this additive change.

</details>

## Technical Considerations

- **Dependencies:** none added. Do not touch `package.json`, `package-lock.json`, `tsconfig.json`, or `scripts/build.mjs`.
- **Config:** none. No environment variables.
- **Security:** no input, no network, no scripts — nothing to harden beyond valid markup.
- **TypeScript gate:** `tsconfig.json` `include` is `["scripts/**/*.ts"]`; adding `products.html` at the root adds no `.ts` file, so `npm run typecheck` (`tsc --noEmit`) is unaffected and continues to pass.

## Testing Strategy

There is no test harness for this static file (by decision — no `test-*.ts` is added). Verification is manual plus a structural check.

- **Manual (primary):**
  1. Open `products.html` by double-clicking it / via `file://` in a browser.
  2. Confirm a header/title and a grid of **eight** cards render.
  3. Confirm each card shows name, description, formatted price (`$NN.NN`), and category.
  4. Confirm out-of-stock product(s) show the "Out of stock" badge and in-stock products show none.
  5. Inspect an out-of-stock card in devtools: confirm `data-id` matches its product id and the id text is not visible.
  6. Open devtools **Network** tab and reload: confirm **zero** network requests. Open **Console**: confirm **zero** errors/warnings.
  7. Resize to ~360px width: confirm single-column layout with no horizontal scroll; resize wide: confirm multi-column grid.
- **Structural (optional):** run the file through an HTML validator (e.g. the W3C Nu validator) to confirm valid HTML5.
- **Regression:** run `npm run typecheck` to confirm the existing TypeScript still passes (it must be unchanged).

## Documentation Updates

- Add a short section to `README.md` (after the existing `## Notes` section at `README.md:81`, or as a new top-level `## Products page` section) stating:
  - A static product list page exists at `products.html` (repo root).
  - It is a self-contained static HTML file with no server and no dependencies.
  - How to open it: "double-click `products.html` or open it via `file://` in any browser."
  - That the product data is hardcoded sample data for demonstration.

## Acceptance Criteria

- [ ] A new file `products.html` exists at the repository root and is valid HTML5 (`<!DOCTYPE html>`, `<html lang="en">`, `charset`, `viewport`, `<title>`).
- [ ] The page uses semantic `<main>` / `<section>` / `<article>` structure, with one `<article>` card per product.
- [ ] Exactly **eight** product cards render.
- [ ] Each card displays `name`, `description`, `price` (USD, two decimals, e.g. `$49.99`), and `category`.
- [ ] Out-of-stock products display an "Out of stock" badge; in-stock products display no badge.
- [ ] Each card has a `data-id` attribute equal to its product `id`, and the `id` is not otherwise visible.
- [ ] All styling is in a single inline `<style>` block; there are no `<link>` stylesheets, no `<script>`, no images, and no external assets.
- [ ] Opening the page triggers **zero** network requests and produces **zero** console errors.
- [ ] The layout is a single column at ~360px and a multi-column grid at desktop widths, with no horizontal overflow.
- [ ] `README.md` documents the page and how to open it.
- [ ] `package.json`, `package-lock.json`, `tsconfig.json`, `scripts/contact.ts`, and `scripts/test-contact.ts` are unchanged; `npm run typecheck` still passes.
