# Outdated Packages Report

_Generated: 2026-07-20 · Weekly dependency review_

This report reviews the project's dependencies against the latest versions
published to the npm registry and proposes upgrades to keep the toolchain
current and secure.

## Summary

| Package | Type | Previous range | Was resolving to | Latest available | New range | Change |
| --- | --- | --- | --- | --- | --- | --- |
| `@types/node` | devDependency | `^20` | 20.19.43 | 26.1.1 | `^26` | Major (20 → 26) |
| `typescript` | devDependency | `^5` | 5.9.3 | 7.0.2 | `^7` | Major (5 → 7) |
| `tsx` | devDependency | `^4` | 4.23.1 | 4.23.1 | `^4` | Up to date |

`npm audit` reports **0 vulnerabilities** both before and after the upgrade.

## Details

### `@types/node` `^20` → `^26`
Node.js type definitions. The project runs on Node 20 locally, but the `@types/node`
major line had advanced to 26. Type-only package (no runtime impact); bumping keeps the
ambient `node` types in sync with newer standard-library surface.

### `typescript` `^5` → `^7`
The TypeScript compiler used by `npm run typecheck` (`tsc --noEmit`). A major-version
bump from 5.x to 7.x. Verified that `tsc --noEmit` still passes with zero errors under
7.0.2 against the existing `scripts/**/*.ts` sources.

### `tsx` `^4` → `^4` (no change)
The TypeScript execution runtime used by the `contact` and `test:contact` scripts.
Already on the latest major; `^4` continues to resolve to the newest 4.x (4.23.1).

## Verification

The proposed upgrades were applied to `package.json`, the lockfile was regenerated
with `npm install`, and the following checks passed:

- `npm run typecheck` (`tsc --noEmit`) — **0 errors**
- `npm audit` — **0 vulnerabilities**
- `tsx` executes the TypeScript sources correctly (scripts load and run)

> Note: `npm run test:contact` performs a **live** Slack send and requires the
> `SLACK_URL` secret to be set. It is not run as part of this dependency review.
