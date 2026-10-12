# Add an optional `phone` field to the Contact Us submission

## Plan Summary

- **What / why:** Let a Contact Us submission optionally carry a `phone` number so it shows up in the Slack notification. The field is optional — omitting it keeps current behavior exactly.
- **Key decisions:** Validate `phone` as E.164 (`/^\+\d{8,15}$/`) **only when present**; treat an omitted / empty / whitespace-only value as absent (valid, no Slack line). Render phone as a third `mrkdwn` entry in the existing Slack `fields` array, immediately after Email, escaped/trimmed like every other field.
- **Most important file:** `scripts/contact.ts` — the whole feature lives here (type, validator, Slack payload builder). `scripts/test-contact.ts` and `README.md` get supporting changes.
- **Priority / complexity:** Medium priority, **low complexity** — a single self-contained feature file, no new dependencies, mirrors existing patterns throughout.
- **Constraints:** Must continue to pass `npm run typecheck` (strict) and `npm run build`; existing Test 1 (live send) and Test 2 (validation count `>= 4`) must keep passing unchanged.

## Problem Statement

The headless "Contact Us → Slack" feature currently accepts four fields — `name`, `email`, `subject`, `body` — defined by the `ContactInput` interface in `scripts/contact.ts:1-6`. Submissions are validated by `validateContact()` (`scripts/contact.ts:19-33`) and, on success, posted to a Slack Incoming Webhook as a Block Kit message built by `buildSlackPayload()` (`scripts/contact.ts:40-63`).

We want to let submitters optionally provide a phone number. When supplied it must be a well-formed E.164 number and must appear in the Slack message right after the Email line; when not supplied, nothing changes.

#### Planning Context

**Key requirements**
- `submitContactForm(input)` (and the underlying `ContactInput`) accepts an optional `phone?: string`.
- When `phone` is present, it must match E.164 — a leading `+` followed by 8–15 digits (`/^\+\d{8,15}$/`). On failure, push a clear issue consistent with existing field errors (`"phone is invalid"`), collected into the same `issues: string[]` and thrown via `ContactValidationError`.
- When `phone` is present, render a `*Phone:*` line in the Slack Block Kit message, positioned after the Email line.
- Extend `scripts/test-contact.ts` to cover the new validation behavior and the new message rendering.
- Document the new optional field in `README.md`.

**Decisions made (with rationale)**
- **"Present" = non-empty after trimming.** Every other field is trimmed before checks (`scripts/contact.ts:21-24,41-44`). Treating `undefined`, `""`, or whitespace-only as *absent* keeps phone genuinely optional and consistent with the existing trim-first convention — an absent phone yields no validation error and no Slack line.
- **Validate only when present.** No `"phone is required"` issue is ever produced; optionality is preserved. This also guarantees Test 2's `issues.length >= 4` assertion is unaffected, because its input carries no phone.
- **E.164 implemented literally as specified** — `/^\+\d{8,15}$/`, tested against the trimmed value. No stricter ITU rules (e.g. forbidding a leading `0` after `+`) are applied, matching the request's exact wording and mirroring the `EMAIL_RE` constant + `.test()` pattern (`scripts/contact.ts:17,28`).
- **Phone renders inside the existing first `section`'s `fields` array**, appended as a third `{ type: "mrkdwn", text: "*Phone:*\n${phone}" }` entry after Email (`scripts/contact.ts:55-57`), only when present, escaped via `esc()` and trimmed like the others.
- **The plain-text `text` fallback (`scripts/contact.ts:50`) is left unchanged.** The request scopes phone to the Block Kit message ("include a Phone line in the Slack Block Kit message after Email"); the fallback is not mentioned, so it stays as-is.

**Out of scope**
- No changes to the plain-text `text` fallback string.
- No stricter phone normalization/formatting (no stripping spaces/dashes, no country-code inference) — only the exact E.164 regex check.
- No new runtime dependencies, no web UI / HTTP server, no changes to the `SLACK_URL` handling.
- No `"phone is required"` behavior — the field stays optional.

## Detailed Requirements

**Functional**
1. `ContactInput` gains an optional `phone?: string`.
2. `validateContact()` adds a phone issue (`"phone is invalid"`) **only** when a non-empty trimmed phone is present and fails `/^\+\d{8,15}$/`. Absent phone → no issue.
3. `buildSlackPayload()` appends a `*Phone:*` `mrkdwn` field immediately after Email **only** when a non-empty trimmed phone is present; the value is passed through `esc()`.
4. All other behaviors (name/email/subject/body validation, header, message section, `text` fallback, `submitContactForm` flow) are unchanged.

**Technical**
- Code must type-check under `strict` + `verbatimModuleSyntax` + `allowImportingTsExtensions` (`tsconfig.json`). Note the existing `type ContactInput` import in the test uses the `type` modifier required by `verbatimModuleSyntax` (`scripts/test-contact.ts:5`) — keep that style for any new type-only imports.
- Add a module-level `PHONE_RE` constant alongside `EMAIL_RE` (`scripts/contact.ts:17`).
- Must pass `npm run typecheck` and `npm run build`.

**Non-Functional**
- Keep changes minimal and pattern-consistent; no new deps.
- User input continues to be escaped before rendering to Slack (phone included), preserving the existing injection-safety posture.

## Proposed Solution

All production logic is one file (`scripts/contact.ts`); tests and docs follow. The change is additive and conditional, so existing callers and the two existing tests are unaffected.

1. Add `phone?: string` to `ContactInput`.
2. Add `const PHONE_RE = /^\+\d{8,15}$/;` next to `EMAIL_RE`.
3. In `validateContact()`, trim `phone` and, when non-empty, push `"phone is invalid"` if it fails `PHONE_RE`.
4. In `buildSlackPayload()`, trim+escape phone when non-empty and conditionally append a `*Phone:*` field after Email in the `fields` array.
5. Optionally add a `phone` to the `main()` sample submission to exercise the new line in the CLI smoke test.
6. Add network-free assertions to `scripts/test-contact.ts` for valid phone, invalid phone, and payload rendering (present + absent).
7. Update `README.md` intro field list and API section.

## Acceptance Criteria

1. `ContactInput` declares `phone?: string`; TypeScript accepts a submission both with and without `phone`.
2. `validateContact()` throws `ContactValidationError` whose `issues` include `"phone is invalid"` when `phone` is present and does not match `/^\+\d{8,15}$/` (e.g. `"12345"`, `"+12"`, `"+1234567890123456"`, `"+1-555-0100"`).
3. `validateContact()` does **not** add any phone issue when `phone` is omitted, `undefined`, `""`, or whitespace-only, nor when it is a valid E.164 value (e.g. `"+14155550100"`).
4. `buildSlackPayload()` output includes a `mrkdwn` field whose text starts with `*Phone:*` positioned immediately after the Email field, **only** when a non-empty trimmed phone is present; the phone value is escaped via `esc()`.
5. `buildSlackPayload()` output contains **no** Phone field when phone is absent/empty.
6. The plain-text `text` fallback string is byte-for-byte unchanged.
7. Existing Test 1 (live send) and Test 2 (`issues.length >= 4`) still pass; the test run still prints `ALL PASS`.
8. `npm run typecheck` and `npm run build` succeed with no errors.
9. `README.md` documents `phone` as an optional, E.164-validated field in both the intro field list and the API section.

<details><summary><b>Implementation Detail</b></summary>

### Implementation Steps

#### Phase 1 — Core feature in `scripts/contact.ts`

**Task 1.1 — Extend `ContactInput`** (`scripts/contact.ts:1-6`)
Add the optional field:
```ts
export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  body: string;
  phone?: string;
}
```

**Task 1.2 — Add `PHONE_RE`** (next to `scripts/contact.ts:17`)
```ts
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// E.164: a leading "+" followed by 8–15 digits.
const PHONE_RE = /^\+\d{8,15}$/;
```

**Task 1.3 — Validate phone when present** (`scripts/contact.ts:19-33`)
Mirror the trim-first pattern used for the other fields and the `EMAIL_RE` guard style. Phone is optional, so only validate a non-empty trimmed value:
```ts
export function validateContact(input: ContactInput): void {
  const issues: string[] = [];
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const subject = input.subject?.trim() ?? "";
  const body = input.body?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";

  if (!name) issues.push("name is required");
  if (!email) issues.push("email is required");
  else if (!EMAIL_RE.test(email)) issues.push("email is invalid");
  if (!subject) issues.push("subject is required");
  if (!body) issues.push("body is required");
  if (phone && !PHONE_RE.test(phone)) issues.push("phone is invalid");

  if (issues.length) throw new ContactValidationError(issues);
}
```
Rationale: the `phone &&` guard enforces optionality — an absent/empty phone never contributes an issue, so Test 2 (`scripts/test-contact.ts:35`, no phone) is unaffected. Message wording `"phone is invalid"` matches the lowercase `"<field> is invalid"` style at `scripts/contact.ts:26-30`.

**Task 1.4 — Render phone in the Slack payload** (`scripts/contact.ts:40-63`)
Trim+escape like the other fields (`scripts/contact.ts:41-44`) and conditionally append after Email in the `fields` array (`scripts/contact.ts:55-57`):
```ts
export function buildSlackPayload(input: ContactInput): object {
  const name = esc(input.name.trim());
  const email = esc(input.email.trim());
  const subject = esc(input.subject.trim());
  const body = esc(input.body.trim());
  const phone = input.phone?.trim() ? esc(input.phone.trim()) : "";

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
Rationale: extracting the `fields` array into a local keeps the conditional push readable while leaving the `text` fallback (`scripts/contact.ts:50`) and both other blocks unchanged. The explicit `{ type: "mrkdwn"; text: string }[]` annotation keeps `type` as the literal `"mrkdwn"` (not widened to `string`) under strict mode. Note `buildSlackPayload` reads `input.name.trim()` directly (no `?.`) because it runs after `validateContact`; keep that convention — use `input.phone?.trim()` for the optional field.

**Task 1.5 (optional) — Exercise the new line in the CLI smoke test** (`scripts/contact.ts:90-95`)
Optionally add `phone: "+14155550100"` to the `sample` submission so `npm run contact` renders the Phone line end-to-end. This is cosmetic and does not affect validation of existing behavior.

#### Phase 2 — Tests in `scripts/test-contact.ts`

Add **network-free** assertions (do not add real Slack sends). Place them after Test 2 (`scripts/test-contact.ts:45`) and before the final `console.log("ALL PASS")`. `buildSlackPayload` must be added to the import from `./contact.ts` (`scripts/test-contact.ts:1-6`).

- **Test 3 — valid phone passes:** `validateContact({ name:"A", email:"a@b.co", subject:"s", body:"b", phone:"+14155550100" })` must not throw.
- **Test 4 — invalid phone rejected:** `validateContact({ name:"A", email:"a@b.co", subject:"s", body:"b", phone:"12345" })` must throw `ContactValidationError` whose `issues` include `"phone is invalid"`.
- **Test 5 — payload includes Phone when present:** `buildSlackPayload({...valid, phone:"+14155550100"})`; assert the first `section` block's `fields` contains an entry whose `text` starts with `*Phone:*` and that it appears after the Email entry.
- **Test 6 — payload omits Phone when absent:** `buildSlackPayload({...valid})` (no phone); assert no `fields` entry text starts with `*Phone:*`.

Follow the existing harness style: each check uses a `try/catch` or a direct boolean assertion, prints `PASS (...)` / `FAIL (...)`, and calls `process.exit(1)` on failure (see Test 2 at `scripts/test-contact.ts:33-45`). Because `buildSlackPayload` returns `object`, cast to a navigable shape in the test (e.g. `as { blocks: { fields?: { text: string }[] }[] }`) to satisfy strict typing when reading `blocks[1].fields`.

Keep Test 1 (live send, `scripts/test-contact.ts:14-31`) and Test 2 intact so `SLACK_URL`-gated live behavior and the `>= 4` count assertion are preserved.

#### Phase 3 — Docs in `README.md`

- **Intro field list** (`README.md:3-8`): change "four fields — **Name**, **Email**, **Subject**, **Body**" to include **Phone** as an *optional* field (e.g. "four required fields … plus an optional **Phone**").
- **API section** (`README.md:68-79`):
  - `interface ContactInput` line (`README.md:70`): add `phone?`.
  - `validateContact` bullet (`README.md:72-74`): note that `phone`, when present, must match E.164 `/^\+\d{8,15}$/` (a `+` followed by 8–15 digits) and is otherwise optional.
  - `buildSlackPayload` bullet (`README.md:75-77`): mention the Phone line is included after Email when a phone is supplied.

### Edge Cases

- **Omitted / `undefined` phone:** `input.phone?.trim() ?? ""` → `""` → treated as absent. No issue, no Slack line.
- **Empty or whitespace-only phone (`""`, `"   "`):** trims to `""` → absent. No issue, no Slack line.
- **Valid E.164 (`"+14155550100"`):** passes validation; rendered as `*Phone:*\n+14155550100`.
- **Too short / too long digits (`"+12"`, `"+1234567890123456"`):** 2 digits / 16 digits fail `{8,15}` → `"phone is invalid"`.
- **Missing `+` (`"14155550100"`):** fails anchor → `"phone is invalid"`.
- **Non-digit characters (`"+1-555-0100"`, `"+1 555 0100"`):** contain `-`/spaces → fail `\d` → `"phone is invalid"` (no normalization performed, by decision).
- **Phone containing escapable chars** (unlikely for E.164 but possible for an invalid value that still reaches rendering only if valid): valid E.164 has none of `&<>`, so `esc()` is a no-op here but is applied for consistency/safety.
- **Multiple invalid fields including phone:** phone issue is collected alongside the others and all are thrown together, matching the single-throw pattern (`scripts/contact.ts:32`).

### Testing Strategy

- **Unit (network-free), via `scripts/test-contact.ts`:** Tests 3–6 above cover valid phone, invalid phone (message content), rendering-present, and rendering-absent. These run without `SLACK_URL` logic (they call `validateContact`/`buildSlackPayload` directly), though the harness still gates Test 1 on `SLACK_URL`.
- **Integration / manual:** `npm run test:contact` with `SLACK_URL` set runs the live send (Test 1) plus all assertions; optionally set a `phone` on the `main()` sample and run `npm run contact` to eyeball the Phone line in Slack.
- **Type/build:** `npm run typecheck` (strict) and `npm run build` must pass.

Commands:
```bash
npm run typecheck
npm run build
npm run test:contact   # requires SLACK_URL for the live Test 1
```

### Technical Considerations

- **Dependencies:** none added. Pure TypeScript using existing patterns and the global `fetch`.
- **Config:** no changes to `SLACK_URL` handling, `package.json` scripts, or `tsconfig.json`.
- **Strict typing:** annotate the `fields` array element type explicitly so `type: "mrkdwn"` stays a literal; cast the `buildSlackPayload` return where the test navigates into `blocks`. Preserve the `type`-modifier import style required by `verbatimModuleSyntax` (`scripts/test-contact.ts:5`).
- **Security:** phone is escaped via `esc()` before rendering, consistent with every other displayed field (`scripts/contact.ts:41-44`), preserving injection-safety. The webhook URL remains unlogged.

### Documentation Updates

- `README.md` intro field list (`README.md:3-8`) — add optional **Phone**.
- `README.md` API section (`README.md:68-79`) — update `ContactInput`, `validateContact`, and `buildSlackPayload` bullets to describe the optional, E.164-validated `phone` and its Slack rendering after Email.

### Dependencies & Related Work

- Self-contained within the Contact Us feature introduced in commit `be432f3` ("Add a 'Contact Us' Submission Feature that Posts to Slack via `SLACK_URL`"). No cross-feature coupling.
- Repo snapshot verified: planned against commit `5297643` (branch `rp-chain-check`/`main`); all referenced `file:line` locations in `scripts/contact.ts`, `scripts/test-contact.ts`, and `README.md` match the current checkout at authoring time. No drift observed.

</details>
