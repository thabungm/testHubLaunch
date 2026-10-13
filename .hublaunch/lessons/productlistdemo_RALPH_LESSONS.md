# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Implemented product-listing module, tests, scripts, README. All checks pass.
- Blockers: None

## Key Discoveries
- Repo is a headless TS project run via `tsx` (Node 20 can't strip TS). Install deps first: `npm install` (tsx is a devDependency, not committed).
- Pattern source: `scripts/contact.ts` (types → ValidationError → validate → action → import.meta.url run guard) and `scripts/test-contact.ts` (PASS/FAIL + process.exit).
- `tsconfig.json` has `verbatimModuleSyntax` → must use `import type` for type-only imports; keep `.ts` extensions on relative imports.
- `npm run build` just runs `tsc --noEmit` via scripts/build.mjs.

## Solutions That Worked
- `scripts/products.ts`: Product interface, ListProductsOptions, ProductQueryValidationError, PRODUCTS (10 items / 4 categories), validateListProductsOptions, listProducts (copy-on-read filter+sort), formatPrice, CLI main() behind run guard.
- `scripts/test-products.ts`: 11 offline PASS/FAIL checks, exits 0 on ALL PASS.
- package.json: added `products` and `test:products` scripts.
- README: added "Product Listing" section.

## Verification Results (all passing)
- `npm run typecheck` → clean
- `npm run build` → clean
- `npm run test:products` → ALL PASS (10 products)
- CLI: full catalog (10), `--category Electronics --sort price --direction desc` works, `--sort bogus` exits 1 with stderr issues.

## Things to Avoid
- Don't rely on `node scripts/*.ts` directly (Node 20). Use tsx via npm scripts.
- `npm run test:contact` requires a live SLACK_URL — unrelated to this change; not run.

## Files Modified
- scripts/products.ts (new)
- scripts/test-products.ts (new)
- package.json (2 new scripts)
- README.md (new section)

## Next Steps
- Done. Optional: commit the work.
