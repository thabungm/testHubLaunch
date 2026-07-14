# Add a "Contact Us" Submission Feature that Posts to Slack via `SLACK_URL`

## Problem Statement

The repository needs a "Contact Us" feature for **testing purposes**: given a submission with four fields — **Name**, **Email**, **Subject**, **Body** — it validates the input and, on submit, posts a formatted message to Slack using the Slack Incoming Webhook URL stored in the `SLACK_URL` environment variable. A companion test must exercise the sender **end-to-end by actually posting a real message to Slack** and confirming success via the HTTP response.

Today no such feature exists. The repo has **no application, no `package.json`, and no web framework** — only bash `hula-*.sh` scripts, HubLaunch config, and skills.

### Planning Context

> This section captures the key decisions from planning so the implementing AI agent has full context. There is **no chat history** available to the implementer — everything needed is in this document.

**Key Requirements Discussed:**

- The feature is a **headless TypeScript module**, not a web UI or HTTP server. "Submit" means calling an exported function `submitContactForm(input)`. This choice was made explicitly (the repo has no web app; a headless module matches the repo's script-based nature and the existing Slack-script precedent).
- Fields required: **Name**, **Email**, **Subject**, **Body** (4 fields; the original request listed "3." twice — that is a typo, there are four distinct fields).
- On submit, post a message to Slack read from the `SLACK_URL` environment variable. `SLACK_URL` is a **Slack Incoming Webhook URL** (`POST` JSON, success = HTTP 200 with body `ok`).
- The message must use **Slack Block Kit** (rich, structured formatting) — a header with the subject, labeled Name/Email fields, and a Message section — not plain text.
- **Validation before sending**: all four fields required (non-empty after trim); **Email must match a basic email regex**. Invalid input is rejected with a clear error **and no Slack message is sent**.
- A **live test** must **actually send a Slack message** and assert the send succeeded (HTTP 200). No mocking of the Slack call for the happy-path test.

**Decisions Made:**

- **TypeScript on Node v24 native type-stripping**, run `.ts` files directly (`node scripts/*.ts`). Rationale: the repo runs Node v24.11.1, which strips TS types natively — no build step, no `tsx`. This mirrors the accepted precedent plan [`.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md`](.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md).
- **No runtime npm dependencies.** Node 18+ ships global `fetch`; use it directly. Do **not** add `axios`, `node-fetch`, or `dotenv`.
- **Block Kit over plain text** (explicit user choice) for a cleaner, structured Slack message. A top-level `text` fallback is still included alongside `blocks` for notifications/accessibility (Slack best practice).
- **Validate then send** — validation runs first; a failure throws a typed error and short-circuits before any network call, so invalid submissions never reach Slack.
- **Headless module + live test** (explicit user choice) over an HTTP form or CLI prompt. Simplest, lowest-risk, purely testing-focused.
- **Separation of concerns**: `scripts/contact.ts` (validation + payload build + sender, all exported and reusable) and `scripts/test-contact.ts` (live end-to-end test).

**Out of Scope:**

- Any web UI, HTML page, or HTTP server/endpoint.
- Interactive CLI prompts.
- Persisting submissions to a database or file.
- Retries, rate-limit handling, backoff, or queueing.
- Spam/abuse protection, CAPTCHA, or auth.
- Sending via the Slack Web API / bot tokens (only the Incoming Webhook `SLACK_URL` is used).
- CI wiring for the test (it is run manually / in the HubLaunch container).

#### Background & Context

- **Why needed**: a runnable proof that the repo can accept a contact-form-shaped submission and deliver it to Slack using the already-configured `SLACK_URL` secret. Framed by the requester as a **testing** feature.
- **Current state**: `SLACK_URL` exists in [.env](.env) and is forwarded to HubLaunch containers via `envVars: ['SLACK_URL']` in [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js). No code consumes it yet. An accepted precedent plan for a simpler fixed-message Slack sender exists at [`.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md`](.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md).
- **Who is affected**: developers running the repo locally or inside a HubLaunch container.

**Current Behavior**: No contact feature exists; `SLACK_URL` is unused by any code.

**Desired Behavior**: Calling `submitContactForm({name, email, subject, body})` validates the input, and on valid input posts a Block Kit message to the Slack webhook and resolves with the HTTP result. Running the test script performs a **real** submission and asserts HTTP 200.

## Detailed Requirements

### Functional Requirements

1. **Types**
   - Export an interface `ContactInput` with exactly: `name: string`, `email: string`, `subject: string`, `body: string`.
   - Export a custom error class `ContactValidationError extends Error` carrying `issues: string[]` (list of human-readable validation problems).

2. **Validation — `validateContact(input: ContactInput): void`**
   - Trim every field before checking.
   - `name`, `subject`, `body` must be **non-empty after trim** — otherwise add an issue like `"name is required"`.
   - `email` must be non-empty **and** match the regex `/^[^@\s]+@[^@\s]+\.[^@\s]+$/` — otherwise add `"email is invalid"`.
   - If any issue exists, `throw new ContactValidationError(...)` with all issues collected (do not stop at the first). **No Slack call is made when validation fails.**

3. **Payload builder — `buildSlackPayload(input: ContactInput): object`**
   - Return a Slack message object with a top-level `text` fallback **and** a `blocks` array (Block Kit):
     - `header` block: `plain_text` = `"📬 New Contact: " + subject`, **truncated to 150 chars** (Slack `plain_text` header limit).
     - `section` with two `fields` (`mrkdwn`): `*Name:*\n<name>` and `*Email:*\n<email>`.
     - `section` with `mrkdwn` `*Message:*\n<body>`, body **truncated to ~2900 chars** (Slack section text limit is 3000; leave headroom for the label).
   - **Escape user text for Slack**: replace `&`→`&amp;`, `<`→`&lt;`, `>`→`&gt;` in all user-provided values before embedding (Slack requires this in message text; prevents malformed rendering / accidental mentions).
   - `text` fallback: `"New contact from <name> (<email>): <subject>"` (escaped).

4. **Sender — `submitContactForm(input: ContactInput): Promise<{ status: number; body: string }>`**
   - Read `process.env.SLACK_URL?.trim()`. If missing/empty, `throw new Error("SLACK_URL environment variable is not set")` (before validation is fine, but do not send).
   - Call `validateContact(input)` — propagates `ContactValidationError` on bad input (no network call).
   - `POST` to `SLACK_URL` with header `Content-Type: application/json` and body `JSON.stringify(buildSlackPayload(input))`.
   - Return `{ status: res.status, body: await res.text() }`. (Slack returns HTTP 200 + body `ok` on success.)
   - Do **not** swallow network errors here — let them reject so callers can report them.

5. **Direct-run CLI guard (`main()`)**
   - When `scripts/contact.ts` is executed directly (not imported), run a `main()` that submits a **sample** valid submission (see below) so the file is runnable on its own for a quick manual smoke test.
   - Sample: `{ name: "Test User", email: "test@example.com", subject: "Contact form smoke test", body: "This is a manual smoke test from scripts/contact.ts." }`.
   - On success (`status === 200` and `body === "ok"`): log a confirmation to stdout, `process.exit(0)`.
   - On `ContactValidationError`: print each issue to stderr, `process.exit(1)`.
   - On missing `SLACK_URL` / non-200 / network error: print the reason (status/body/message, **never the URL**) to stderr, `process.exit(1)`.
   - Use the ESM direct-run idiom: `if (import.meta.url === \`file://${process.argv[1]}\`) { await main(); }`.

6. **Live test — `scripts/test-contact.ts`**
   - Import `submitContactForm`, `validateContact`, `ContactValidationError`, and `ContactInput` from `./contact.ts`.
   - **Guard**: if `SLACK_URL` is unset/empty, print `FAIL: SLACK_URL not set — cannot run live test` and `process.exit(1)`.
   - **Test 1 (live happy path — actually sends to Slack):**
     - Build a valid submission with an **identifiable, unique-ish subject** so it can be found in Slack. Because `Date.now()`/`Math.random()` are allowed in normal Node scripts (this is a runtime `.ts` file, not a workflow script), use `new Date().toISOString()` in the subject, e.g. `subject: "Contact Us test — " + new Date().toISOString()`.
     - Call `submitContactForm(valid)`.
     - Assert `status === 200` (per requirement, HTTP status is the success check). Log `PASS (live send): HTTP 200, body: ok`.
   - **Test 2 (validation — no network):**
     - Call `validateContact({ name: "", email: "not-an-email", subject: "", body: "" })` inside a try/catch.
     - Assert it throws `ContactValidationError` and that `issues` includes entries for name, email, subject, body. Log `PASS (validation): rejected <N> invalid fields`.
     - This proves invalid input is rejected **without** sending to Slack.
   - Print an overall `ALL PASS` and `process.exit(0)` only if both tests pass; otherwise print `FAIL: <reason>` and `process.exit(1)`.

### Technical Requirements

- **Language/Runtime**: TypeScript executed by Node v24 native type-stripping (`node scripts/*.ts`). Global `fetch` (Node 18+). Repo runs Node **v24.11.1** (verified).
- **Location**: new top-level `scripts/` directory; new `package.json` at repo root (mirrors precedent plan).
- **Dependencies**: **none** at runtime. Optional dev fallback only for Node < 22: `tsx` (`npx tsx scripts/...`).
- **Constraints**: `.env` is gitignored and holds `SLACK_URL`; scripts read from **`process.env`** only — they do **not** parse `.env`. The caller exports `SLACK_URL` first (e.g. `set -a; source .env; set +a`) or runs inside the HubLaunch container that already forwards it.

### Non-Functional Requirements

- **Security**: `SLACK_URL` is a secret webhook — **never** log it. On error, log status/body/message only. `.env` stays gitignored (already configured). Escape user input in the Slack payload (see FR3) to avoid malformed rendering or unintended `@`/channel mentions.
- **Backwards Compatibility**: additive only — new files; no changes to existing bash scripts or config.
- **Error Handling**: typed `ContactValidationError` for bad input; plain `Error` for config/network failures; non-zero exit codes with stderr messages in CLI paths.

## Proposed Solution

**High-level approach**: Add a `scripts/` folder with two `.ts` files and a minimal root `package.json`. `contact.ts` exposes `validateContact`, `buildSlackPayload`, and `submitContactForm` (composed: validate → build Block Kit → `fetch` POST). `test-contact.ts` imports these and runs a real live send plus a no-network validation check.

### Key Components

1. **`scripts/contact.ts`** — `ContactInput`, `ContactValidationError`, `validateContact()`, `buildSlackPayload()` (Block Kit), `submitContactForm()`, and a direct-run `main()` smoke test.
2. **`scripts/test-contact.ts`** — live end-to-end test (real Slack send, assert HTTP 200) + validation-rejection test.
3. **`package.json`** — `"type": "module"` + convenience npm scripts.

### Files Likely to Change / Create

- `scripts/contact.ts` — **NEW**. Validation + Block Kit builder + sender + CLI smoke test.
- `scripts/test-contact.ts` — **NEW**. Live test harness.
- `package.json` — **NEW**. ESM flag + `contact` / `test:contact` scripts.
- `README.md` — **NEW or appended**. Usage + `SLACK_URL` export instructions.

### Code Patterns to Follow

- **Precedent plan** [`.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md`](.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md): copy its structure — exported sender function, direct-run guard via `import.meta.url`, live test asserting HTTP 200, no deps, `package.json` with `"type": "module"`. This feature extends that pattern with 4 fields + validation + Block Kit.
- **Env-var-driven, fail-fast** style of [.github/scripts/](.github/scripts/) bash scripts (e.g. `hula-read-config.sh`): check required env early, clear stderr message, non-zero exit.
- **`SLACK_URL` as Incoming Webhook**: success is HTTP 200 body `ok`; payload supports `text` and/or `blocks`.

**Anti-Patterns to Avoid:**

- Do NOT add `axios`, `node-fetch`, or `dotenv` — Node v24 has `fetch`; the environment already supplies `SLACK_URL`.
- Do NOT hard-code or echo the webhook URL anywhere.
- Do NOT introduce a build/transpile pipeline — run `.ts` directly.
- Do NOT send to Slack when validation fails.
- Do NOT mock the Slack call in the happy-path test — the requirement is a real send.

### Reference Implementation (for the implementing agent)

`scripts/contact.ts`:

```ts
export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  body: string;
}

export class ContactValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(`Invalid contact submission: ${issues.join("; ")}`);
    this.name = "ContactValidationError";
    this.issues = issues;
  }
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateContact(input: ContactInput): void {
  const issues: string[] = [];
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const subject = input.subject?.trim() ?? "";
  const body = input.body?.trim() ?? "";

  if (!name) issues.push("name is required");
  if (!email) issues.push("email is required");
  else if (!EMAIL_RE.test(email)) issues.push("email is invalid");
  if (!subject) issues.push("subject is required");
  if (!body) issues.push("body is required");

  if (issues.length) throw new ContactValidationError(issues);
}

// Slack requires escaping these three characters in message text.
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildSlackPayload(input: ContactInput): object {
  const name = esc(input.name.trim());
  const email = esc(input.email.trim());
  const subject = esc(input.subject.trim());
  const body = esc(input.body.trim());

  const header = `📬 New Contact: ${subject}`.slice(0, 150);
  const message = body.slice(0, 2900);

  return {
    text: `New contact from ${name} (${email}): ${subject}`,
    blocks: [
      { type: "header", text: { type: "plain_text", text: header } },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Name:*\n${name}` },
          { type: "mrkdwn", text: `*Email:*\n${email}` },
        ],
      },
      { type: "section", text: { type: "mrkdwn", text: `*Message:*\n${message}` } },
    ],
  };
}

export async function submitContactForm(
  input: ContactInput,
): Promise<{ status: number; body: string }> {
  const url = process.env.SLACK_URL?.trim();
  if (!url) throw new Error("SLACK_URL environment variable is not set");

  validateContact(input); // throws ContactValidationError; no send on failure

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildSlackPayload(input)),
  });
  return { status: res.status, body: await res.text() };
}

async function main(): Promise<void> {
  const sample: ContactInput = {
    name: "Test User",
    email: "test@example.com",
    subject: "Contact form smoke test",
    body: "This is a manual smoke test from scripts/contact.ts.",
  };
  try {
    const { status, body } = await submitContactForm(sample);
    if (status === 200 && body === "ok") {
      console.log(`Contact submitted to Slack (HTTP ${status})`);
      process.exit(0);
    }
    console.error(`Contact send failed: HTTP ${status}, body: ${body}`);
    process.exit(1);
  } catch (err) {
    if (err instanceof ContactValidationError) {
      console.error("Validation failed:");
      for (const i of err.issues) console.error(`  - ${i}`);
    } else {
      console.error(`Contact error: ${(err as Error).message}`);
    }
    process.exit(1);
  }
}

// Run main only when executed directly, not when imported by the test.
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
```

`scripts/test-contact.ts`:

```ts
import {
  submitContactForm,
  validateContact,
  ContactValidationError,
  type ContactInput,
} from "./contact.ts";

async function run(): Promise<void> {
  if (!process.env.SLACK_URL?.trim()) {
    console.error("FAIL: SLACK_URL not set — cannot run live test");
    process.exit(1);
  }

  // Test 1: live happy path — actually sends a message to Slack.
  const valid: ContactInput = {
    name: "Test User",
    email: "test@example.com",
    subject: `Contact Us test — ${new Date().toISOString()}`,
    body: "Live end-to-end test sending a real Slack message via SLACK_URL.",
  };
  try {
    const { status, body } = await submitContactForm(valid);
    if (status !== 200) {
      console.error(`FAIL (live send): expected HTTP 200, got ${status}, body: ${body}`);
      process.exit(1);
    }
    console.log(`PASS (live send): HTTP ${status}, body: ${body}`);
  } catch (err) {
    console.error(`FAIL (live send): ${(err as Error).message}`);
    process.exit(1);
  }

  // Test 2: validation rejects bad input WITHOUT sending to Slack.
  try {
    validateContact({ name: "", email: "not-an-email", subject: "", body: "" });
    console.error("FAIL (validation): expected ContactValidationError, none thrown");
    process.exit(1);
  } catch (err) {
    if (err instanceof ContactValidationError && err.issues.length >= 4) {
      console.log(`PASS (validation): rejected ${err.issues.length} invalid fields`);
    } else {
      console.error(`FAIL (validation): unexpected error ${(err as Error).message}`);
      process.exit(1);
    }
  }

  console.log("ALL PASS");
  process.exit(0);
}

await run();
```

`package.json`:

```json
{
  "name": "test-hub-launch-contact",
  "private": true,
  "type": "module",
  "scripts": {
    "contact": "node scripts/contact.ts",
    "test:contact": "node scripts/test-contact.ts"
  }
}
```

> Note: `import.meta.url === \`file://${process.argv[1]}\`` is the ESM idiom for "run only if invoked directly." Keep the `.ts` extension on the import (`./contact.ts`) for Node v24 native type-stripping. If a machine runs Node < 22, fall back to `npx tsx scripts/...`. If a `package.json` already exists at repo root when implementing, **merge** these fields instead of overwriting.

## Implementation Steps

#### Phase 1: Setup

- [ ] Create root `package.json` with `"type": "module"` and `contact` / `test:contact` scripts (content above). If one already exists, merge.
- [ ] Create the `scripts/` directory.

#### Phase 2: Core Module

- [ ] Create `scripts/contact.ts` with `ContactInput`, `ContactValidationError`, `validateContact()`, `esc()`, `buildSlackPayload()` (Block Kit), `submitContactForm()`, and the direct-run `main()` guard (content above).
- [ ] Confirm validation collects **all** issues and throws before any `fetch` call.

#### Phase 3: Live Test

- [ ] Create `scripts/test-contact.ts` importing from `./contact.ts` — live happy-path send (assert HTTP 200) + validation-rejection test (content above).

#### Phase 4: Verify & Document

- [ ] Run the manual tests below (with `SLACK_URL` exported).
- [ ] Create/append `README.md` documenting how to export `SLACK_URL` and run both scripts, plus the Node ≥ 22 requirement and `tsx` fallback.

## Edge Cases & Considerations

#### Edge Cases to Handle

1. **`SLACK_URL` unset/empty** → `submitContactForm` throws `"SLACK_URL environment variable is not set"`; the test's guard prints `FAIL` and exits 1; the CLI `main()` exits 1.
2. **Invalid input** (any blank field or bad email) → `ContactValidationError` thrown, **no Slack call**; `main()` lists each issue and exits 1.
3. **Whitespace-only fields** → treated as empty via `.trim()` → validation issue.
4. **Non-200 Slack response** (bad/expired webhook, e.g. 404 `no_service`) → returned `status`/`body`; test/CLI report it and exit 1.
5. **Network failure** (`fetch` rejects) → error propagates; test/CLI catch, log message, exit 1.
6. **Very long subject/body** → subject truncated to 150 chars in the header block; body truncated to ~2900 chars in the section (Slack limits). Full subject still appears in the `text` fallback.
7. **Special characters** (`&`, `<`, `>`, `@channel`) in user input → escaped via `esc()` so Slack renders them literally and does not fire mentions.

#### Potential Challenges

- ⚠️ **Node TS execution**: relies on Node ≥ 22 (repo has v24.11.1). On older Node, `node scripts/*.ts` fails — fallback `npx tsx`. Documented in README.
- ⚠️ **`.env` not auto-loaded**: scripts read `process.env` only; the runner must export `SLACK_URL` first (`set -a; source .env; set +a`).
- ⚠️ **Block Kit schema strictness**: an invalid block structure returns HTTP 400 `invalid_blocks`. Follow the exact payload shape in the reference implementation.

#### Security Considerations

- `SLACK_URL` is a secret webhook — never log it; log only status/body/message on error.
- `.env` stays gitignored (already configured in [.gitignore](.gitignore)).
- User input is escaped before embedding in the Slack payload.

## Technical Considerations

#### Dependencies

- None required at runtime. Optional dev fallback: `tsx@^4` only if targeting Node < 22.

#### Configuration Changes

- None. `SLACK_URL` is already forwarded via `envVars: ['SLACK_URL']` in [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js).

#### Environment Variables

- `SLACK_URL` — Slack Incoming Webhook URL. Already present in [.env](.env) and forwarded to HubLaunch containers.

#### Error Handling Strategies

- Missing `SLACK_URL` → `throw Error` / CLI stderr + `exit(1)`.
- Invalid input → `ContactValidationError` (all issues) / CLI lists issues + `exit(1)`, no send.
- Failed send / non-200 → return status+body; test/CLI report + `exit(1)`.
- Success → stdout confirmation + `exit(0)`.

## Testing Requirements

#### Unit / Logic Tests (in `scripts/test-contact.ts`)

- [ ] `validateContact` rejects all-blank input and returns ≥ 4 issues (no network).
- [ ] `validateContact` rejects `email: "not-an-email"` (bad format) — covered by the all-blank case; optionally add a case with only email invalid.

#### Integration Test (live — actually sends to Slack)

- [ ] `submitContactForm(valid)` posts a **real** Block Kit message to `SLACK_URL` and returns HTTP 200 (body `ok`). Subject includes an ISO timestamp for identification in Slack.

#### Manual Testing Checklist

1. **Setup** — export the var from `.env`:
   ```bash
   set -a; source .env; set +a
   ```
2. **Happy path — CLI smoke test**:
   ```bash
   node scripts/contact.ts
   ```
   - Expected: stdout `Contact submitted to Slack (HTTP 200)`, exit 0, message visible in Slack.
3. **Happy path — live test**:
   ```bash
   node scripts/test-contact.ts
   ```
   - Expected: stdout `PASS (live send): HTTP 200, body: ok`, then `PASS (validation): rejected 4 invalid fields`, then `ALL PASS`, exit 0.
4. **Missing var**:
   ```bash
   unset SLACK_URL; node scripts/test-contact.ts; echo "exit=$?"
   ```
   - Expected: stderr `FAIL: SLACK_URL not set — cannot run live test`, `exit=1`.
5. **Bad webhook**:
   ```bash
   SLACK_URL="https://hooks.slack.com/services/INVALID" node scripts/test-contact.ts; echo "exit=$?"
   ```
   - Expected: `FAIL (live send): expected HTTP 200, got 404 ...`, `exit=1`.

#### Test Data Requirements

- A valid `SLACK_URL` webhook in `.env` for the live happy-path test (already present).

## Documentation Updates

#### User-Facing Documentation

- [ ] Create/append `README.md` with:
  - How to export `SLACK_URL` (`set -a; source .env; set +a`).
  - `node scripts/contact.ts` — CLI smoke test (sends a sample submission).
  - `node scripts/test-contact.ts` — live test (real send + validation check).
  - The four fields (Name, Email, Subject, Body) and that email is format-validated.
  - Node ≥ 22 requirement / `tsx` fallback.

#### Code Documentation

- [ ] JSDoc on `submitContactForm`, `validateContact`, `buildSlackPayload`.
- [ ] Inline comment on the escaping and truncation logic.

## Acceptance Criteria

- [ ] **AC1**: `submitContactForm({name, email, subject, body})` with valid input and a valid `SLACK_URL` posts a Block Kit message to Slack and resolves with `{ status: 200, body: "ok" }`.
- [ ] **AC2**: `node scripts/test-contact.ts` performs a **real** Slack send, prints `PASS (live send): HTTP 200`, and exits 0.
- [ ] **AC3**: `validateContact` rejects blank fields and invalid email with a `ContactValidationError` listing all issues, and **no Slack message is sent** on invalid input.
- [ ] **AC4**: With `SLACK_URL` unset, the sender throws / the test exits 1 with a clear message.
- [ ] **AC5**: A non-200 webhook response causes the test/CLI to exit 1 with the status logged.
- [ ] **AC6**: The webhook URL is never printed to stdout/stderr.
- [ ] **AC7**: The Slack message uses Block Kit (header with subject + Name/Email fields + Message section) and escapes `&`/`<`/`>` in user input.
- [ ] **AC8**: No runtime npm dependencies added; scripts run via `node scripts/*.ts` on Node v24.
- [ ] **AC9**: `README.md` documents setup and usage.

#### Definition of Done

- All acceptance criteria met.
- Manual test checklist passes (including a real message appearing in Slack).
- No changes to existing bash scripts or config beyond additive new files.
- `.env` remains uncommitted.

## Dependencies & Related Work

#### Dependencies

- [ ] Valid `SLACK_URL` webhook (present in `.env`).
- [ ] Node ≥ 22 runtime (repo: v24.11.1).

#### Blockers

- None.

#### Related

- Precedent: [`.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md`](.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md) — simpler fixed-message Slack sender + live test; this feature extends its pattern.
- Config: `envVars: ['SLACK_URL']` in [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js).
