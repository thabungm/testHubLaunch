# Add an optional, E.164-validated `phone` field to the Contact Us → Slack submission

## Plan Summary

- **What / why:** Extend the headless "Contact Us → Slack" flow so a submission may include an optional `phone` string; when present it must be a valid E.164 number (`+` followed by 8–15 digits) and is rendered as a "Phone" line in the Slack Block Kit message right after Email. This gives submitters an optional contact channel without changing any required behavior.
- **Key decisions:** No new dependency — validate with a plain regex `PHONE_RE = /^\+\d{8,15}$/`, mirroring the existing `EMAIL_RE` approach. Treat empty/whitespace-only `phone` as *absent* (no error, no rendered line). Escape the rendered value with the existing `esc()` helper for consistency with Name/Email.
- **Most important file:** `scripts/contact.ts` — the entire feature lives here (interface, validation, payload builder). Tests go in `scripts/test-contact.ts`; docs in `README.md`.
- **Scope:** Three files touched (`scripts/contact.ts`, `scripts/test-contact.ts`, `README.md`). All changes are additive and backward-compatible — existing callers that omit `phone` behave identically.
- **Priority / complexity:** Low complexity, self-contained, no runtime dependencies or config changes.

## Problem Statement

The Contact Us feature is a headless function (`submitContactForm`) that validates a submission and posts a Slack Block Kit message to an Incoming Webhook URL (`SLACK_URL`). Today a submission carries exactly four fields — **Name**, **Email**, **Subject**, **Body** — all defined in `scripts/contact.ts`. There is no way to capture a phone number.

We want to add an **optional** `phone` field end-to-end: the data shape, the validator, and the Slack message. When a caller supplies `phone`, it must be a valid E.164 number or validation fails with a clear, field-style message consistent with the existing ones. When present, the Slack message shows a "Phone" line immediately after Email. When absent (undefined, empty, or whitespace-only), nothing changes — no error and no rendered line.

#### Planning Context

**Key requirements**
- `ContactInput` gains an optional `phone?: string` member.
- `validateContact()` validates `phone` only when a non-empty (trimmed) value is present, using E.164 format `+` then 8–15 digits.
- Validation failures are collected into `ContactValidationError.issues` exactly like the existing checks (a single throw after all issues are gathered).
- `buildSlackPayload()` appends a `*Phone:*` `mrkdwn` entry to the existing `section.fields` array, immediately after the Email entry, only when `phone` is present; the value is escaped with `esc()`.
- `scripts/test-contact.ts` covers: (a) a valid phone renders a Phone field in the payload, (b) an invalid phone is rejected with a phone-related issue, (c) omitted phone still passes validation.
- `README.md` documents the new optional field across the field list, the `ContactInput` signature line, and the `validateContact`/`buildSlackPayload` descriptions.

**Decisions made (with rationale)**
- **Regex, no library** — the spec fixes the exact format (`+` then 8–15 digits), so `PHONE_RE = /^\+\d{8,15}$/` is sufficient and preserves the project's "no runtime npm dependencies" constraint (README line 15; `package.json` has no runtime deps). This mirrors the existing `EMAIL_RE` pattern at `scripts/contact.ts:17,28`.
- **Empty/whitespace == absent** — because `phone` is optional, a trimmed-empty value is treated as "not provided": no `"phone is required"` issue and no rendered line. Only a non-empty trimmed value is validated/rendered. This matches the request's wording ("When present …").
- **Message wording `"phone is invalid"`** — mirrors the existing `"email is invalid"` style (`scripts/contact.ts:28`).
- **Escape with `esc()`** — all rendered user input currently passes through `esc()` (`scripts/contact.ts:36–44`); phone should too, for consistency and safety.
- **Placement after Email** — both Name and Email are `mrkdwn` entries in a single `section.fields` array (`scripts/contact.ts:54–58`); appending the Phone entry there (after Email) is the natural, in-section "after Email" placement.

**Out of scope**
- The top-level `text` fallback summary line (`scripts/contact.ts:50`) is **not** changed — the request scopes the visible change to the Block Kit "Phone" line.
- No web UI / HTTP layer exists or is added — "submit" remains a direct call to `submitContactForm()`.
- No change to the required fields or to the existing `issues.length >= 4` assertion behavior.
- The fixed `main()` sample (`scripts/contact.ts:89–95`) need not set `phone`; if one is added it must be a valid E.164 value so the smoke test still passes.

## Detailed Requirements

**Functional**
1. `submitContactForm(input)` accepts an input whose `phone` is optional.
2. When `phone` is present (non-empty after trim) and not a valid E.164 number, `validateContact()` throws a `ContactValidationError` whose `issues` includes a phone-related message (`"phone is invalid"`).
3. When `phone` is absent (undefined / empty / whitespace-only), no phone issue is raised and no Phone line is rendered.
4. When `phone` is present and valid, `buildSlackPayload()` includes a `*Phone:*` `mrkdwn` field immediately after the Email field.

**Technical**
- Valid E.164 = `/^\+\d{8,15}$/` (a literal `+` then 8–15 ASCII digits; no spaces, dashes, or parentheses).
- Trim `phone` before validating and before rendering, matching every other field (`scripts/contact.ts:21–24, 41–44`).
- Escape the rendered phone with `esc()`.
- Code must remain strict-clean under `tsc --noEmit` (`tsconfig.json`: `strict: true`, `verbatimModuleSyntax: true`, `allowImportingTsExtensions: true`). Keep the `type`-only import style in the test file (`import { … , type ContactInput }`).

**Non-Functional**
- No new runtime dependencies.
- Backward compatible: callers omitting `phone` see identical behavior.
- No secrets logged; `SLACK_URL` handling unchanged.

## Proposed Solution

Make three additive edits in `scripts/contact.ts` and extend the test + docs:

1. **Interface** — add `phone?: string` to `ContactInput` (after `email`, to mirror Slack ordering).
2. **Validation** — add a `PHONE_RE` constant and, inside `validateContact()`, trim `phone` and, only if non-empty, push `"phone is invalid"` when it fails `PHONE_RE`.
3. **Rendering** — in `buildSlackPayload()`, build the `fields` array so the Email entry is followed by a Phone entry *only when* a non-empty trimmed `phone` is present.

The data flows through one module, so no cross-component diagram is warranted.

## Acceptance Criteria

- [ ] `ContactInput` has an optional `phone?: string` member.
- [ ] `validateContact()` throws `ContactValidationError` with a phone-related issue when `phone` is present and does not match `/^\+\d{8,15}$/` (e.g. `"+1"`, `"123456789"`, `"+1 555 0000"`, `"+12345678901234567"`).
- [ ] `validateContact()` does **not** raise a phone issue when `phone` is undefined, `""`, or whitespace-only.
- [ ] `buildSlackPayload()` includes a `*Phone:*\n<value>` `mrkdwn` entry in `section.fields` immediately after the Email entry when a valid `phone` is present, and omits it otherwise.
- [ ] The rendered phone value is escaped via `esc()`.
- [ ] `scripts/test-contact.ts` covers valid-phone rendering, invalid-phone rejection, and omitted-phone acceptance; the existing Test 1 (live) and Test 2 (`issues.length >= 4`) still pass.
- [ ] `README.md` documents the optional, E.164-validated `phone` field.
- [ ] `npm run typecheck` passes clean.

<details><summary><b>Implementation Detail</b></summary>

## Implementation Steps

### Phase 1 — Data shape (`scripts/contact.ts`)

Add the optional member to `ContactInput` (currently lines 1–6), placed after `email` to mirror the Slack field ordering:

```ts
export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  body: string;
}
```

### Phase 2 — Validation (`scripts/contact.ts`)

Add a `PHONE_RE` constant next to `EMAIL_RE` (line 17):

```ts
const PHONE_RE = /^\+\d{8,15}$/;
```

In `validateContact()` (lines 19–33), trim `phone` alongside the other fields and validate only when present. Follow the exact issue-collection shape already used for `email` (`scripts/contact.ts:21–32`):

```ts
export function validateContact(input: ContactInput): void {
  const issues: string[] = [];
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  const subject = input.subject?.trim() ?? "";
  const body = input.body?.trim() ?? "";

  if (!name) issues.push("name is required");
  if (!email) issues.push("email is required");
  else if (!EMAIL_RE.test(email)) issues.push("email is invalid");
  if (phone && !PHONE_RE.test(phone)) issues.push("phone is invalid");
  if (!subject) issues.push("subject is required");
  if (!body) issues.push("body is required");

  if (issues.length) throw new ContactValidationError(issues);
}
```

Note the `if (phone && …)` guard — an empty/whitespace-only phone (which trims to `""`, a falsy value) is skipped, so optional-absent inputs raise no issue.

### Phase 3 — Slack rendering (`scripts/contact.ts`)

In `buildSlackPayload()` (lines 40–63), trim `phone`, escape it, and conditionally append the Phone entry to the `section.fields` array right after Email (currently lines 54–58). Build the fields array explicitly so the conditional entry keeps its position:

```ts
export function buildSlackPayload(input: ContactInput): object {
  const name = esc(input.name.trim());
  const email = esc(input.email.trim());
  const phone = esc(input.phone?.trim() ?? "");
  const subject = esc(input.subject.trim());
  const body = esc(input.body.trim());

  const header = `📬 New Contact: ${subject}`.slice(0, 150);
  const message = body.slice(0, 2900);

  const fields: { type: "mrkdwn"; text: string }[] = [
    { type: "mrkdwn", text: `*Name:*\n${name}` },
    { type: "mrkdwn", text: `*Email:*\n${email}` },
  ];
  if (phone) fields.push({ type: "mrkdwn", text: `*Phone:*\n${phone}` });

  return {
    text: `New contact from ${name} (${email}): ${subject}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: header } },
      { type: "section", fields },
      { type: "section", text: { type: "mrkdwn", text: `*Message:*\n${message}` } },
    ],
  };
}
```

Rationale for the explicit `fields` typing: under `strict`, an inferred array of object literals would be fine, but giving the `type` property a string-literal type (`"mrkdwn"`) keeps the shape compatible with the pushed entry and avoids `type` widening to `string`. If the implementer prefers, an equivalent approach is to compute the array with a spread + conditional (`...(phone ? [{…}] : [])`); either is acceptable as long as the Phone entry lands directly after Email.

Note: `phone` here is escaped from `input.phone?.trim() ?? ""`, so an absent phone yields `""` (falsy) and the entry is skipped — consistent with the validator. This guard independently protects rendering even though `buildSlackPayload()` is only reached after `validateContact()` passes in the `submitContactForm()` path (`scripts/contact.ts:79–84`).

### Phase 4 — Tests (`scripts/test-contact.ts`)

The existing test file has two tests: Test 1 is a live Slack send (lines 14–31); Test 2 asserts `validateContact` rejects bad input with `issues.length >= 4` (lines 33–45). Add new, **network-free** cases after Test 2 and before the final `ALL PASS` (line 47). Import `buildSlackPayload` by adding it to the existing import block (lines 1–6):

```ts
import {
  submitContactForm,
  validateContact,
  buildSlackPayload,
  ContactValidationError,
  type ContactInput,
} from "./contact.ts";
```

Add these cases (no network — pure function calls), mirroring Test 2's `try/catch` + `process.exit(1)` style (lines 34–44):

```ts
// Test 3: valid phone renders a Phone field after Email (no network).
const withPhone: ContactInput = {
  name: "Test User",
  email: "test@example.com",
  phone: "+15555550123",
  subject: "Phone render test",
  body: "Body text.",
};
validateContact(withPhone); // must not throw
const payload = buildSlackPayload(withPhone) as {
  blocks: { type: string; fields?: { type: string; text: string }[] }[];
};
const section = payload.blocks.find((b) => Array.isArray(b.fields));
const texts = section?.fields?.map((f) => f.text) ?? [];
const emailIdx = texts.findIndex((t) => t.startsWith("*Email:*"));
const phoneIdx = texts.findIndex((t) => t.startsWith("*Phone:*"));
if (phoneIdx !== emailIdx + 1 || !texts[phoneIdx]?.includes("+15555550123")) {
  console.error(`FAIL (phone render): expected a Phone field right after Email, got ${JSON.stringify(texts)}`);
  process.exit(1);
}
console.log("PASS (phone render): Phone field rendered after Email");

// Test 4: invalid phone is rejected with a phone-related issue (no network).
try {
  validateContact({
    name: "A",
    email: "a@b.co",
    phone: "not-a-number",
    subject: "S",
    body: "B",
  });
  console.error("FAIL (phone validation): expected ContactValidationError, none thrown");
  process.exit(1);
} catch (err) {
  if (err instanceof ContactValidationError && err.issues.some((i) => i.includes("phone"))) {
    console.log("PASS (phone validation): invalid phone rejected");
  } else {
    console.error(`FAIL (phone validation): unexpected error ${(err as Error).message}`);
    process.exit(1);
  }
}

// Test 5: omitted phone still validates (optional field, no network).
validateContact({ name: "A", email: "a@b.co", subject: "S", body: "B" });
const noPhone = buildSlackPayload({ name: "A", email: "a@b.co", subject: "S", body: "B" }) as {
  blocks: { type: string; fields?: { type: string; text: string }[] }[];
};
const noPhoneSection = noPhone.blocks.find((b) => Array.isArray(b.fields));
if ((noPhoneSection?.fields ?? []).some((f) => f.text.startsWith("*Phone:*"))) {
  console.error("FAIL (phone omitted): Phone field should not render when phone is absent");
  process.exit(1);
}
console.log("PASS (phone omitted): no Phone field when phone absent");
```

These are additive and do not alter Test 1 or Test 2, so the existing `issues.length >= 4` assertion (line 39) remains valid.

### Phase 5 — Documentation (`README.md`)

- **Field list (line 4):** change "four fields — **Name**, **Email**, **Subject**, **Body**" to include an optional **Phone** — e.g. "— **Name**, **Email**, optional **Phone**, **Subject**, **Body** —".
- **`ContactInput` signature (line 70):** update to `interface ContactInput { name; email; phone?; subject; body }`.
- **`validateContact` description (lines 72–74):** add that, when present, `phone` must match `/^\+\d{8,15}$/` (E.164: `+` then 8–15 digits), and is otherwise optional.
- **`buildSlackPayload` description (lines 75–77):** note the optional "Phone" field is rendered after Email when present.

## Edge Cases

- **Whitespace-only phone** (`"   "`) → trims to `""` → treated as absent (no issue, no render).
- **`phone` present but wrong format** (`"+1"`, `"12345678"` without `+`, `"+1 555 0000"` with spaces, `"+1234567890123456"` 16 digits) → `"phone is invalid"` collected.
- **Boundary lengths:** `+12345678` (8 digits) valid; `+123456789012345` (15 digits) valid; `+1234567` (7) and `+1234567890123456` (16) invalid.
- **Escaping:** a phone containing `&`, `<`, or `>` (unusual but possible from untrusted input) is escaped like other fields; such values would also fail `PHONE_RE`, so in the validated path they never reach rendering — the `esc()` call is defensive consistency.

## Risks & Mitigations

- **Strict-mode typing of the `fields` array** — widening of the literal `type` property could cause a `tsc` error. Mitigation: annotate the array element type as shown, or use the spread-conditional form. Verify with `npm run typecheck`.
- **Field ordering regression** — the "after Email" requirement is positional. Mitigation: Test 3 asserts `phoneIdx === emailIdx + 1`.

## Rollout & Validation

- Run `npm run typecheck` (`tsc --noEmit`, strict) — must pass.
- Run `npm run test:contact` with `SLACK_URL` set — Tests 1–5 should print their PASS lines and `ALL PASS`. (Tests 3–5 are network-free; Test 1 still requires `SLACK_URL`.)

## Dependencies & Related Work

- No new npm dependencies; validation is a plain regex and rendering uses existing helpers.
- No config, environment, or build changes. `package.json` scripts (`contact`, `test:contact`, `typecheck`) and `tsconfig.json` are unchanged.
- All changes confined to `scripts/contact.ts`, `scripts/test-contact.ts`, and `README.md`.

</details>

## Technical Considerations

- **Dependencies / config:** none added — regex validation only; no changes to `package.json` or `tsconfig.json`.
- **Security:** rendered phone passes through `esc()` for `& < >`, consistent with all other user-provided fields (`scripts/contact.ts:36–44`); no new logging of inputs; `SLACK_URL` handling untouched.
- **Type safety:** keep everything strict-clean (`strict`, `verbatimModuleSyntax`); preserve the `type`-only import style in the test file.

## Testing Strategy

- **Unit (network-free):** Tests 3–5 in `scripts/test-contact.ts` call `validateContact`/`buildSlackPayload` directly — valid-phone rendering & position, invalid-phone rejection, omitted-phone acceptance.
- **Integration (live):** existing Test 1 performs a real Slack send via `SLACK_URL`; unchanged and must still pass.
- **Regression:** existing Test 2 (`issues.length >= 4`) is unaffected.
- **Manual:** `npm run typecheck` and `npm run test:contact` (with `SLACK_URL` exported). Optionally `npm run contact` for the fixed-sample smoke test.

## Documentation Updates

Update `README.md`: the field-list sentence (line 4), the `ContactInput` signature line (line 70), and the `validateContact`/`buildSlackPayload` descriptions (lines 72–77) to document the optional, E.164-validated `phone` field rendered after Email.
