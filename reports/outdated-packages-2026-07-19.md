# Weekly Outdated-Packages Check — 2026-07-19

Automated weekly dependency audit (plan: `check-outdated-packages`).

## Method

1. Read `package.json` and enumerated declared dependencies.
2. Installed the current tree (`npm install`) and queried the npm registry with
   `npm outdated` and `npm view <pkg> version` for the latest published version.
3. Verified proposed upgrades by installing them and running the project's
   `typecheck` (`tsc --noEmit`) plus a `tsx` runtime smoke test of
   `scripts/contact.ts`.

## Findings

| Package        | Type | Current   | Latest   | Status              |
| -------------- | ---- | --------- | -------- | ------------------- |
| `@types/node`  | dev  | 20.19.43  | 26.1.1   | ⬆️ major behind     |
| `typescript`   | dev  | 5.9.3     | 7.0.2    | ⬆️ major behind     |
| `tsx`          | dev  | 4.23.1    | 4.23.1   | ✅ up to date       |

`npm audit` reports **0 vulnerabilities**.

## Recommended updates (applied in this PR)

- **`@types/node` `^20` → `^26.1.1`** — Node.js type definitions. The runtime
  Node in this environment is v20.20.2; the newer `@types/node` remains
  backward-compatible for the APIs this project uses (`process.env`, `fetch`,
  `URL`). Typecheck passes.
- **`typescript` `^5` → `^7.0.2`** — TypeScript 7 (the native compiler port).
  `tsc --noEmit` passes cleanly against the existing sources with no code
  changes required.
- **`tsx` `^4`** — already at the latest 4.x (4.23.1); no change needed.

## Verification

- `npm run typecheck` → passes (0 errors) with the upgraded compiler.
- `tsx` runtime smoke test of `validateContact()` → passes (blank input is
  rejected with `ContactValidationError`).
- `npm audit` → 0 vulnerabilities.

## Recommendation

Merge the version bumps in this PR. All upgrades were validated against the
existing type-check and runtime paths before proposing them. Re-run this audit
next cycle to catch new releases and security patches.
