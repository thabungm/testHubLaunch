# Add a Static Product List Page (`products.html`)

## Plan Summary

- **What / why:** Add a single hand-written, self-contained `products.html` at the repository root — a real, openable ecommerce product list page that displays eight hardcoded sample products in a responsive card grid. It satisfies the "add product list page" request using this repo's static-HTML "page" convention (precedent: the prior "Add Simple Contact Page" static-HTML work).
- **Key decisions:** Static HTML file only (no web server, no framework, no TypeScript generator, no npm/test scripts, **no new runtime dependencies**); listing/grid only (no sorting, filtering, search, pagination, cart, or checkout); product data hardcoded directly in the markup; text-only cards (no images, no external assets — fully offline-safe); all styling in one inline `<style>` block.
- **Most important file:** `products.html` (new, repo root) — the entire deliverable. Secondary: a short `README.md` section documenting it.
- **Untouched:** `scripts/contact.ts`, `scripts/test-contact.ts`, `package.json`, `tsconfig.json`, `scripts/build.mjs`. No `.ts` file is added, so `npm run typecheck` is unaffected.
- **Priority / complexity:** Low complexity, purely additive. One new file plus a README note.

## Problem Statement

The request is to "Add product list page ecommerce" for the project `thabungm/testHubLaunch`. This repository is headless: `README.md:7` states "There is no web UI or HTTP server," the only feature module is `scripts/contact.ts`, the build step is just `tsc --noEmit` (`scripts/build.mjs`), and `package.json` declares `"type": "module"` with **zero runtime dependencies**. There is no web framework, no router, no product/catalog data, and no `Product` type anywhere in the codebase.

Despite the headless codebase, a "product list page" is a user-facing artifact. The chosen form is a **static HTML file** — a real page that opens directly in a browser via `file://` — matching the precedent set by the earlier "Add Simple Contact Page (Static HTML Form)" work (hand-written HTML committed at the repo root, no TypeScript, no server). This keeps the deliverable openable and standalone while honoring the repo's no-server, no-new-dependency constraints.

#### Planning Context

**Key requirements**
- One new file: `products.html`, hand-written, committed at the **repository root**.
- Opens directly in a browser via `file://` with **no** web server, framework, build step, or runtime dependency.
- Displays **eight** hardcoded sample products in a **responsive card grid**.
- Each product card shows: `name` (heading), `description` (short text), `price` in USD with two decimals (e.g. `$49.99`), `category` (label/tag), and a stock indicator — an **"Out of stock" badge when `inStock` is false**, nothing shown when true. The product `id` is present as a `data-id` attribute on the card (not visible to the user).
- **Text-only cards** — no product images, no external assets, no web fonts, no scripts, no network requests. Fully offline-safe.
- All styling lives in a **single inline `<style>` block** in `<head>` — no separate CSS file.

**Decisions made (with rationale)**
- **Static HTML file only, no server/framework/deps** — the repo forbids runtime dependencies and has no HTTP server; a static file is the only form that keeps the page "real and openable" without violating those constraints, and it matches the existing static-HTML-page precedent.
- **Hand-written HTML at repo root, no TypeScript generator / npm script / test script** — the contact-page precedent (`contact.html` at repo root) is hand-written static HTML, not a generated artifact. Choosing this (over a `scripts/products.ts` generator) means no `.ts` is added and the TypeScript toolchain / `npm run typecheck` is entirely unaffected.
- **Single self-contained file with inline `<style>`** — simpler to open and move than an HTML + separate CSS pair; keeps the whole page in one artifact.
- **Text-only cards, no images** — the repo's HTML-output convention is "no external assets." Avoiding images keeps the page fully offline-safe (no network needed to render).
- **Default field set, eight products** — no `Product` type exists, so the field set (`id`, `name`, `description`, `price`, `category`, `inStock`) and sample count (8) are chosen defaults confirmed for this plan.

**Out of scope**
- Sorting, filtering by category, search, and pagination.
- Cart, checkout, payments, user accounts, product detail pages.
- Any Slack integration (the repo's Slack wiring is specific to the Contact Us feature and is unrelated here).
- Any web server, framework (Express/Next/Vite), bundler, or client-side JS.
- Any committed JSON data file or external product API — data is inline only.
- Any new or modified `.ts` file, `npm` script, `package.json` dependency, or `tsconfig` change.

## Detailed Requirements

### Functional
1. `products.html` renders a titled product list page (e.g. an `<h1>` such as "Products" or "Our Products").
2. Exactly **eight** product cards are displayed, with data embedded directly in the HTML markup.
3. Each card displays, at minimum:
   - Product **name** as a heading.
   - A short **description**.
   - **Price** formatted as USD with exactly two decimals and a leading `$` (e.g. `$49.99`, `$9.00`).
   - **Category** as a visible label/tag.
   - An **"Out of stock"** badge **only when** that product's stock is false; nothing stock-related is shown when it is in stock.
4. Each card carries the product `id` as a `data-id` attribute on the card element; the `id` is not rendered as visible text.
5. The grid is **responsive**: multiple columns at desktop widths, collapsing to a single column (or fewer columns) at phone widths.

### Technical
1. Valid **HTML5**: `<!DOCTYPE html>`, `<html lang="en">`, `<meta charset="utf-8">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, and a `<title>`.
2. Use **semantic** elements: `<main>` wrapping the content, a `<section>` for the grid, and an `<article>` per product card.
3. **All CSS inline** in a single `<style>` block inside `<head>`. No external stylesheet, no `<link>` to fonts/CSS, no CDN references.
4. **No JavaScript** — no `<script>` tags, inline or external.
5. **No external assets or network requests** — no `<img src="http...">`, no background-image URLs pointing off-box, no web fonts. System font stack only.
6. File lives at the **repository root**: `/products.html`.

### Non-Functional
1. **Offline-safe**: opening the file from disk (`file://`) renders fully with no network access.
2. **No console errors** in the browser devtools when opened.
3. **Responsive** and legible at both phone (~375px) and desktop (~1280px) widths.
4. **Additive and non-breaking**: no existing file's behavior changes; `npm run typecheck`, `npm run contact`, and `npm run test:contact` are all unaffected.
5. Accessible basics: sufficient color contrast, a logical heading order (`<h1>` page title, product names as `<h2>`/`<h3>`), and the out-of-stock state conveyed by text (not color alone).

## Proposed Solution

Create a single static HTML document, `products.html`, at the repository root. The page consists of:

- A `<head>` with the required meta tags, a `<title>`, and one `<style>` block defining the layout (CSS grid for the card area), card styling, the category tag, the price, and the out-of-stock badge — using only a system font stack and solid colors (no images/gradients requiring assets).
- A `<body>` containing a `<main>` with an `<h1>` page title and a `<section>` that holds eight `<article>` card elements. Each `<article>` has a `data-id` attribute and contains the name heading, category tag, description, price, and (conditionally) the out-of-stock badge.

The eight sample products are written directly into the markup as literal card elements (no templating, no data file). Prices are written pre-formatted as `$NN.NN` strings. The out-of-stock badge is simply present in the markup for the products that are out of stock and absent for the rest.

This is a flat, single-component change — no cross-component data flow — so no architecture diagram is warranted.

## Implementation Steps

### Phase 1 — Create `products.html` at the repository root
File: `/products.html` (new).

1. Add the HTML5 skeleton: `<!DOCTYPE html>`, `<html lang="en">`, `<head>` with `<meta charset="utf-8">`, the viewport meta tag, and a `<title>` (e.g. "Products").
2. Add a single `<style>` block in `<head>`:
   - A base rule using a system font stack (e.g. `font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;`), a light page background, and sensible body margin/padding.
   - A responsive grid for the product section, e.g. `display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem;` so it naturally collapses to one column on narrow screens.
   - Card styling for `<article>`: border/shadow, border-radius, padding, background.
   - A `.category` tag style (small, pill/label look) and a `.price` style (prominent).
   - An `.out-of-stock` badge style (clearly readable text such as "Out of stock", conveyed by text plus an accent color for contrast — not color alone).
3. Add `<body>` → `<main>` → `<h1>` page title → `<section class="product-grid">`.
4. Inside the section, add **eight** `<article class="product-card" data-id="...">` cards. Each card contains: an `<h2>`/`<h3>` with the product name, a `<p class="description">`, a `<div class="category">` tag, a `<div class="price">$NN.NN</div>`, and — only for out-of-stock products — a `<div class="out-of-stock">Out of stock</div>`.
5. Choose eight realistic sample products spanning a few categories, with a mix of in-stock and out-of-stock (at least one of each so both states are visible). Suggested seed set (planner-chosen; adjust copy freely):

   | id | name | category | price | inStock |
   |----|------|----------|-------|---------|
   | `p-001` | Wireless Headphones | Audio | `$89.99` | true |
   | `p-002` | Mechanical Keyboard | Accessories | `$129.00` | true |
   | `p-003` | USB-C Charging Cable | Accessories | `$12.50` | true |
   | `p-004` | 4K Webcam | Peripherals | `$74.99` | false |
   | `p-005` | Bluetooth Speaker | Audio | `$45.00` | true |
   | `p-006` | Ergonomic Mouse | Peripherals | `$39.99` | true |
   | `p-007` | Laptop Stand | Office | `$29.95` | false |
   | `p-008` | Noise-Cancelling Earbuds | Audio | `$59.99` | true |

   Each needs a one-sentence `description`. Prices are written directly as `$NN.NN` strings (two decimals, leading `$`).

### Phase 2 — Document the page in `README.md`
File: `README.md` (edit).

1. Add a short section (e.g. `## Product list page`) noting that `products.html` is a standalone static page and how to open it — e.g. "Open `products.html` directly in a browser (double-click, or `file://` path); it needs no server and no build step."
2. Keep it brief; do not alter the existing Contact Us documentation.

### Phase 3 — Verify
1. Open `products.html` in a browser (double-click or `file://`), with devtools open, offline if possible.
2. Confirm: all eight cards render; prices show two decimals; the out-of-stock badge appears only on `p-004` and `p-007`; categories and descriptions are visible; layout reflows from multi-column (desktop) to single-column (phone width).
3. Confirm **no console errors** and **no network requests** in the Network tab.
4. Confirm `git status` shows only `products.html` (new) and `README.md` (modified); no other files changed.

<details><summary><b>Implementation Detail</b></summary>

### Edge Cases
- **Mixed stock states must both be exercised** — include at least one out-of-stock and one in-stock product so the badge's presence/absence is both demonstrable. The seed table above uses `p-004` and `p-007` as out of stock.
- **Price formatting** — always two decimals, even for whole-dollar amounts (`$129.00`, not `$129`). Since values are hand-written, write them already formatted.
- **Long descriptions / names** — card CSS should tolerate varying text lengths (allow wrapping; avoid fixed card heights that clip content).
- **Narrow viewport** — at ~320–375px the grid must not overflow horizontally; `minmax(240px, 1fr)` with `auto-fill` plus body padding handles this, but verify no horizontal scrollbar appears.
- **`data-id` is non-visible** — ensure the id only appears as the attribute, never as rendered text.
- **Color-alone signaling** — the out-of-stock state must be readable as the literal text "Out of stock," not conveyed by color only (accessibility).

### Data Shape (conceptual)
Although no code type is introduced, each card represents this conceptual shape:

```
Product {
  id: string            // e.g. "p-004" — rendered as data-id, not visible
  name: string          // heading
  description: string    // short sentence
  price: string          // pre-formatted USD, two decimals, e.g. "$74.99"
  category: string       // visible tag/label
  inStock: boolean       // false → show "Out of stock" badge; true → show nothing
}
```

### Security
- No user input, no network calls, no scripts, no secrets. Nothing from `process.env` or `SLACK_URL` is involved. The page is static and inert, so there is no injection or data-exposure surface.
- Because all content is author-written literal HTML (not interpolated from any source), there is no escaping concern; still, write ordinary text content and avoid stray unescaped `<`, `>`, `&` in descriptions.

### Testing Strategy
- **Unit:** none applicable — there is no code/logic to unit-test (static markup only). No test harness is added.
- **Integration:** none — no modules, server, or data flow.
- **Manual (primary verification):**
  1. Open `products.html` from disk in a modern browser.
  2. Verify eight cards, correct fields, correct price formatting, out-of-stock badge only where expected.
  3. Verify responsive reflow at phone and desktop widths (devtools device toolbar).
  4. Verify zero console errors and zero network requests (devtools Console + Network tabs; test offline to be sure).
  5. Optionally validate the markup with the W3C HTML validator for well-formedness.
- **Regression guard:** run `npm run typecheck` to confirm the TypeScript build is untouched (it will pass unchanged because no `.ts` was added), and confirm `git status` shows only the two intended files.

### Documentation Updates
- `README.md`: add a brief "Product list page" section describing `products.html` and how to open it (no server/build required). Do not modify the existing Contact Us content.
- No other docs, no changes to `.hublaunch/` process artifacts.

### Dependencies & Related Work
- **Dependencies:** none added. No `package.json`, `package-lock.json`, or `tsconfig.json` changes. Uses only a browser to view.
- **Precedent / related work:**
  - "Add Simple Contact Page (Static HTML Form)" and "Add Simple About Us Page (Static HTML)" (tracked in `.hublaunch/trackedPlans.json`) — the static-HTML-at-repo-root "page" pattern this plan follows.
  - `.hublaunch/plans/features/2026-07-17-19:54-slack-health-page.md` — prior "page" request documenting the repo's "'page' = headless render target, not a web server" convention and the "no external assets" rule for HTML output.
  - `README.md:7` — establishes the repo is headless with "no web UI or HTTP server," the constraint that rules out a server-based solution.
  - `scripts/contact.ts` / `scripts/test-contact.ts` — the TypeScript feature-module convention this deliverable deliberately does **not** use (static HTML was chosen instead), left entirely untouched.

</details>

## Technical Considerations
- **No dependencies / no config:** the change adds no packages and touches no build/config files. `package.json` stays at zero runtime dependencies; `tsconfig.json`'s `include: ["scripts/**/*.ts"]` never sees a new file.
- **Toolchain isolation:** because the deliverable is `.html` (not `.ts`), `npm run typecheck` (`tsc --noEmit`, strict) is neither helped nor hindered and will pass unchanged.
- **Security:** static, inert page — no scripts, inputs, network calls, or secrets; no injection surface.

## Testing Strategy
- Primary verification is **manual** (open in browser; confirm cards, fields, price formatting, conditional out-of-stock badge, responsive reflow, zero console errors, zero network requests). No automated tests are added because there is no executable logic.
- Run `npm run typecheck` and inspect `git status` as a regression guard to confirm the change is additive and the TypeScript build is untouched.

## Documentation Updates
- Add a short "Product list page" section to `README.md` explaining that `products.html` is a standalone static page opened directly in a browser (no server/build). Leave existing Contact Us docs unchanged.

## Acceptance Criteria
1. A new file `products.html` exists at the repository root and opens directly in a browser via `file://` with no server or build step.
2. The page renders exactly **eight** product cards in a responsive grid (multi-column on desktop, single/fewer columns on phone widths) with no horizontal overflow at ~375px.
3. Each card displays the product's name (as a heading), description, price formatted as USD with two decimals and a leading `$`, and category tag.
4. An **"Out of stock"** badge appears on, and only on, the products marked out of stock; in-stock products show no stock badge.
5. Each card carries the product `id` as a non-visible `data-id` attribute.
6. The page is valid HTML5 (doctype, `lang`, charset, viewport meta, `<title>`) using semantic `<main>`/`<section>`/`<article>`, with all CSS in one inline `<style>` block and **no** `<script>`, external CSS/font links, or image/network requests.
7. Opening the page offline produces **no console errors** and **no network requests**.
8. `README.md` documents `products.html` and how to open it.
9. `npm run typecheck` passes unchanged, and `git status` shows only `products.html` (added) and `README.md` (modified) — `scripts/contact.ts`, `scripts/test-contact.ts`, `package.json`, and `tsconfig.json` are untouched.
