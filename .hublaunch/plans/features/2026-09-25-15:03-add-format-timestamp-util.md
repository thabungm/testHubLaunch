# Add a `formatTimestamp` Utility Function

## Plan Summary

- **What/why**: End-to-end regression probe for HubLaunch's hosted Node/TypeScript launch pipeline against production (confirming the merged Python/PHP sandbox work hasn't regressed the existing Node path).
- **Key decision**: Trivial, isolated new file — doesn't touch `scripts/contact.ts`, keeps the change minimal and self-contained.
- **Most important file**: `scripts/format.ts` (new).
- **Priority/complexity**: Low priority, Simple.

## Problem Statement

There's no shared timestamp-formatting helper in this repo. Add a small, pure `formatTimestamp(date: Date): string` utility function in a new file `scripts/format.ts`, returning the date's ISO 8601 string (`date.toISOString()`).

## Proposed Solution

Create `scripts/format.ts` exporting a single function:

```typescript
export function formatTimestamp(date: Date): string {
  return date.toISOString();
}
```

## Implementation Steps

- [ ] Create `scripts/format.ts` with the `formatTimestamp` function exactly as shown above (named export, explicit `Date` param type, explicit `string` return type).

## Acceptance Criteria

- [ ] `scripts/format.ts` exists and exports `formatTimestamp(date: Date): string`.
- [ ] `npm run typecheck` (`tsc --noEmit`) passes with no errors.
- [ ] No other file is changed.
