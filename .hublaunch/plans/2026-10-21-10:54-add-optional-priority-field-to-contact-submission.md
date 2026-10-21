# Add an optional `priority` field to the Contact Us submission

## Plan Summary

- **What/why:** Add an optional `priority` field (`"low" | "normal" | "high"`) to `ContactInput` so submitters can flag urgency, and surface it visibly in the Slack Block Kit message so a reader can distinguish high-priority submissions at a glance. This is an explicitly disposable end-to-end test of the HubLaunch pipeline.
- **Key decisions:** Omitted `priority` → send exactly as today with no indicator (backward compatible). Invalid value → hard-reject in `validateContact` via the existing collect-then-throw pattern. Render priority as a new `*Priority:*` field (with a colored emoji) appended to the existing Name/Email fields section.
- **Most important file:** `scripts/contact.ts` — holds the type, validator, and Slack payload builder that all change. Supporting edits in `scripts/test-contact.ts` and `README.md`.
- **Priority/complexity:** Low complexity, small surface (3 code/doc files + 1 test file). No new dependencies, no config changes.

## Problem Statement

The headless "Contact Us → Slack" feature (`scripts/contact.ts`) accepts a submission with four fields — `name`, `email`, `subject`, `body` — validates it, and posts a Slack Block Kit message to the webhook in `SLACK_URL`. There is currently no way to mark a submission's urgency, so every message looks identical in the channel and a reader cannot tell a high-priority contact apart from a routine one.

This change adds an **optional** `priority` field accepting exactly `"low"`, `"normal"`, or `"high"`. When supplied, the Slack message must visibly indicate it. The change must stay small and confined to the five artifacts the request names plus the README.

#### Planning Context

**Key requirements**
- `priority?` is optional on `ContactInput` and accepts exactly the lowercase strings `"low" | "normal" | "high"`.
- When a priority is supplied, the Slack message visibly indicates it.
- Touch only: the input type, the validation, the Slack payload builder, the sample submission in `scripts/contact.ts`, and the existing tests in `scripts/test-contact.ts`. Document the field in `README.md`.

**Decisions made (with rationale)**
- **Omitted `priority` → no indicator, send exactly as today** (Q1 answer: A). Preserves backward compatibility and matches the request's "when a priority is supplied" wording. The no-priority payload stays byte-for-byte identical to today's.
- **Invalid `priority` → hard reject** (Q3 answer: A). `validateContact` pushes an issue (e.g. `"priority is invalid"`) and throws `ContactValidationError` with no send, consistent with the existing collect-then-throw pattern at `scripts/contact.ts:19-33`.
- **Render as a `*Priority:*` field with a colored emoji in the existing fields section** (Q2 answer: "Other — pick one if the payload shape isn't meaningfully affected"). Having examined the block layout at `scripts/contact.ts:49-62`, appending a third element to the `fields` array of the existing section block is a small, additive change that does not meaningfully alter the payload shape, and the only test assertion on the send path is HTTP 200 (`scripts/test-contact.ts:23`) — no downstream schema depends on the shape. This matches the recommended option and the existing Name/Email fields pattern. Recorded under **Assumptions**.

**Out of scope**
- No new product behavior beyond the single `priority` field.
- No changes to config, CI, `package.json`, `tsconfig.json`, or any `.hublaunch/*` file.
- No new npm dependency; the enum check is hand-written to honor the "no runtime dependencies" goal (`README.md:15`).
- No `.hublaunch/goals.md` created (Q4 answer: C — No).
- Case-insensitive acceptance, defaulting omitted to `"normal"`, or coercing invalid values are all explicitly NOT done.

## Detailed Requirements

**Functional**
1. `ContactInput` gains an optional `priority?: "low" | "normal" | "high"` field.
2. When `priority` is `undefined` (omitted), behavior and payload are identical to today — no `*Priority:*` field, no other change.
3. When `priority` is one of the three valid values, the Slack message's `blocks` includes a `*Priority:*` field showing a colored emoji + capitalized label.
4. When `priority` is present but not one of the three valid values, `validateContact` collects an issue string and throws `ContactValidationError` (no send).

**Technical**
1. The union type must typecheck under strict mode (`npm run typecheck` → `tsc --noEmit`, `package.json:8`).
2. The emoji/label mapping is a fixed internal lookup table, not derived from raw input (the enum value itself needs no `esc()` escaping, but keep rendering driven by a fixed table).
3. The validation check follows the collect-then-throw shape in `validateContact` (`scripts/contact.ts:19-33`): push to `issues[]`, never short-circuit, throw once at the end.

**Non-Functional**
1. No new runtime dependencies.
2. Change confined to `scripts/contact.ts`, `scripts/test-contact.ts`, and `README.md`.
3. Existing tests (live send + 4-field rejection) remain intact and passing.

## Proposed Solution

Extend the single `ContactInput` interface with `priority?`, add one membership check to `validateContact`, and conditionally append one `fields` entry in `buildSlackPayload`. A module-level constant maps each priority to an emoji + label. The sample submission in `main()` is given `priority: "high"` so the CLI smoke test exercises the new rendering. Tests gain a validation-rejection assertion for an invalid priority and a `buildSlackPayload` shape assertion for a supplied priority.

The feature lives entirely in one file with two small consumers (test, README), so no cross-component diagram is warranted.

## Implementation Steps

### Phase 1 — Type + validation (`scripts/contact.ts`)
1. Add an exported union alias and the optional field to `ContactInput` (`scripts/contact.ts:1-6`):
   ```ts
   export type ContactPriority = "low" | "normal" | "high";

   export interface ContactInput {
     name: string;
     email: string;
     subject: string;
     body: string;
     priority?: ContactPriority;
   }
   ```
2. Add a module-level constant with the valid values and the display mapping (place near `EMAIL_RE` at `scripts/contact.ts:17`):
   ```ts
   const PRIORITIES: readonly ContactPriority[] = ["low", "normal", "high"];
   const PRIORITY_DISPLAY: Record<ContactPriority, string> = {
     high: "🔴 High",
     normal: "🟡 Normal",
     low: "🟢 Low",
   };
   ```
3. In `validateContact` (`scripts/contact.ts:19-33`), after the existing field checks and before the `if (issues.length) throw ...` line, add a membership check that only runs when `priority` is supplied:
   ```ts
   if (input.priority !== undefined && !PRIORITIES.includes(input.priority)) {
     issues.push("priority is invalid");
   }
   ```
   Follow the existing collect-then-throw shape — do not short-circuit; the single throw at `scripts/contact.ts:32` handles it.

### Phase 2 — Slack payload (`scripts/contact.ts`)
4. In `buildSlackPayload` (`scripts/contact.ts:40-63`), after assembling the existing fields, conditionally append a Priority field to the Name/Email `fields` array (`scripts/contact.ts:55-58`) only when `input.priority` is a valid key:
   ```ts
   const fields = [
     { type: "mrkdwn", text: `*Name:*\n${name}` },
     { type: "mrkdwn", text: `*Email:*\n${email}` },
   ];
   if (input.priority !== undefined && input.priority in PRIORITY_DISPLAY) {
     fields.push({ type: "mrkdwn", text: `*Priority:*\n${PRIORITY_DISPLAY[input.priority]}` });
   }
   ```
   Use `fields` as the section block's `fields` value. When `priority` is omitted the array is unchanged, keeping the no-priority payload byte-for-byte identical to today.

### Phase 3 — Sample submission (`scripts/contact.ts`)
5. In `main()`'s `sample` object (`scripts/contact.ts:90-95`), add `priority: "high"` so the CLI smoke test visibly exercises the new rendering.

### Phase 4 — Tests (`scripts/test-contact.ts`)
6. Add a validation-rejection test for an invalid priority: call `validateContact` with otherwise-valid fields plus `priority: "urgent"` (cast as needed to bypass the compile-time union, e.g. `priority: "urgent" as unknown as ContactPriority`) and assert a `ContactValidationError` is thrown whose `issues` includes `"priority is invalid"`. Model it on Test 2 (`scripts/test-contact.ts:33-45`).
7. Add a payload-shape test: import `buildSlackPayload`, build a payload for a valid input with `priority: "high"`, and assert the `blocks` section `fields` array contains an entry whose text starts with `*Priority:*` and includes the high emoji/label. Keep this network-free (no send).
8. Leave Test 1 (live send) and Test 2 (4-field rejection) intact.

### Phase 5 — Documentation (`README.md`)
9. Update the `ContactInput` bullet (`README.md:70`) to include the optional field, e.g. `interface ContactInput { name; email; subject; body; priority? }`.
10. Update the `validateContact` bullet (`README.md:72-74`) to note that a supplied `priority` must be one of `"low" | "normal" | "high"` or it is rejected as an issue.
11. Update the `buildSlackPayload` bullet (`README.md:75-77`) to note that a supplied `priority` renders as a `*Priority:*` field with a colored emoji, and that omitting it leaves the message unchanged.

<details><summary><b>Implementation Detail</b></summary>

### Edge Cases
- **Omitted priority** (`input.priority === undefined`): no validation issue, no `*Priority:*` field. Payload identical to today.
- **Invalid priority** (e.g. `"urgent"`, `"HIGH"`, `""`): matching is case-sensitive, so `"HIGH"` and `""` are invalid and rejected. `validateContact` pushes `"priority is invalid"` and throws; `submitContactForm` never sends because validation runs first (`scripts/contact.ts:79`).
- **Invalid priority reaching `buildSlackPayload` directly**: the `input.priority in PRIORITY_DISPLAY` guard means an invalid value renders no field rather than crashing. In the normal flow `submitContactForm` validates before building, so this is defense-in-depth only.
- **Enum needs no escaping**: `priority` is not user free-text in rendering — the displayed string comes from the fixed `PRIORITY_DISPLAY` table, so `esc()` is intentionally not applied to it.

### Testing Strategy
- **Typecheck:** `npm run typecheck` must pass under strict mode — confirms the union type and the `Record<ContactPriority, string>` mapping are sound.
- **Unit / network-free:** new `buildSlackPayload` assertion for a supplied `priority` (checks the `*Priority:*` field is present with the right emoji/label); new `validateContact` rejection assertion for an invalid priority.
- **Integration / live:** existing Test 1 live send (`scripts/test-contact.ts:15-31`) still asserts HTTP 200; with the sample now carrying `priority: "high"`, running `npm run contact` posts a message visibly showing the Priority field.
- **Manual:** run `npm run contact` with `SLACK_URL` set and confirm the Slack message shows `🔴 High` under a `Priority:` label; run `npm run test:contact` and confirm `ALL PASS`.

### Documentation Updates
- `README.md` API section (`README.md:68-79`): update the three bullets listed in Phase 5. Stay within the existing bullet style; no new section.

### Acceptance Criteria
1. `ContactInput` has an optional `priority?: "low" | "normal" | "high"`; `npm run typecheck` passes.
2. `validateContact` with a valid input and `priority` omitted throws nothing; with a valid input and `priority: "urgent"` throws `ContactValidationError` whose `issues` includes `"priority is invalid"`.
3. `buildSlackPayload` with `priority` omitted returns a payload byte-for-byte identical to the pre-change output; with `priority: "high"` the section `fields` array includes a `*Priority:*` entry containing the high emoji/label.
4. The sample submission in `main()` includes `priority: "high"`.
5. `scripts/test-contact.ts` retains Test 1 (live send, HTTP 200) and Test 2 (≥4-field rejection) and adds the invalid-priority rejection and payload-shape assertions; `npm run test:contact` prints `ALL PASS`.
6. `README.md` documents the new field across the `ContactInput`, `validateContact`, and `buildSlackPayload` bullets.
7. No files outside `scripts/contact.ts`, `scripts/test-contact.ts`, and `README.md` are changed.

### Dependencies & Related Work
- **No new dependencies.** The enum check is hand-written; the Slack call still uses global `fetch`.
- **Repo snapshot:** context was captured at commit `5dd7a6423a0fff037432818912c7744a58c21fb1` (branch `main`). The current checkout is on branch `recs-e2e-4`; all referenced line numbers were re-verified against the working tree and match. If a later edit shifts lines, treat the quoted code anchors as the source of truth over the exact line numbers.
- **No external callers:** a repo-wide grep finds `buildSlackPayload` / `validateContact` / `submitContactForm` / `ContactInput` referenced only in `scripts/contact.ts`, `scripts/test-contact.ts`, `README.md`, and non-code notes — nothing else imports the module, so the payload shape change is safe.

</details>

## Assumptions

- **Q2 (Slack rendering) decided here:** priority renders as a `*Priority:*` field appended to the existing Name/Email fields section, with a colored emoji (🔴 High / 🟡 Normal / 🟢 Low). Per the Q2 answer, this was chosen without a further follow-up because appending one `fields` entry does not meaningfully change the payload shape (the alternative — a header prefix — is comparably minor) and the only send-path assertion is HTTP 200, so no downstream schema is affected. This matches the recommended option and the existing fields pattern at `scripts/contact.ts:54-58`.
- Matching is **case-sensitive** against the exact lowercase strings `"low"`, `"normal"`, `"high"`; values like `"HIGH"` are invalid and rejected.
- The `priority?` field is added to the single existing `ContactInput` interface; no separate type module is introduced (the repo has none).
- The no-priority payload stays byte-for-byte identical to today's.
- The sample submission in `main()` is given `priority: "high"` so the smoke test visibly exercises the new rendering.
- README updates stay within the existing API bullet style (`README.md:68-79`); no new section is added.
- The emoji/label strings are an internal fixed table; exact glyphs may be adjusted during implementation as long as high/normal/low remain visually distinct and the label is capitalized.
