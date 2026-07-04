# Add TypeScript Script to Post "Welcome to my test" to Slack via `SLACK_URL`

## Problem Statement

The repository needs a small, standalone script that sends the fixed message `Welcome to my test` to Slack by reading the `SLACK_URL` environment variable (a Slack Incoming Webhook URL). A companion test script must exercise the sender end-to-end and confirm success via the HTTP response. Today no such script exists and there is no Node/TypeScript toolchain in the repo — only bash `hula-*.sh` scripts and config.

### Planning Context

> This section captures the key decisions from planning so the implementing agent has full context. There is no chat history available to the implementer — everything needed is in this document.

**Key Requirements Discussed:**

- Send the exact message text `Welcome to my test` (no variables, no formatting extras).
- Read the destination from the `SLACK_URL` environment variable. `SLACK_URL` is a Slack Incoming Webhook URL (POST JSON `{"text": "..."}`).
- Implement in **TypeScript** (required choice, overriding the repo's existing bash-only pattern).
- Provide a **separate test script** that runs the sender and verifies success by **HTTP status** (200 + Slack body `ok`).
- If `SLACK_URL` is unset or empty, **print an error to stderr and exit with code 1** (fail-fast).

**Decisions Made:**

- **TypeScript over bash**: the required language is TypeScript even though every existing script (`.github/scripts/hula-*.sh`) is bash. This requires introducing a minimal Node/TypeScript setup.
- **No new npm dependencies for HTTP**: Node 18+ (repo runs Node v24.11.1) ships a global `fetch`. Use it directly — do not add `axios`/`node-fetch`.
- **No transpile step / no `tsx` dependency required**: Node v24 runs `.ts` files directly via native type-stripping (`node scripts/send-slack.ts`). A `package.json` is added only to declare `"type": "module"` and convenience `npm` scripts. `tsx` is listed as an optional fallback for older Node.
- **Verify by HTTP status**: the test performs a real POST to `SLACK_URL` and passes only when the response is HTTP 200 with body `ok` (Slack webhooks return the literal string `ok` on success). No mocking.
- **Two files**: `scripts/send-slack.ts` (sender, also exports a reusable function) and `scripts/test-send-slack.ts` (test harness). Separation matches "test it through a script".

**Out of Scope:**

- Configurable message text or channel/target (message is hard-coded `Welcome to my test`).
- Retries, rate-limit handling, or backoff.
- Mocked/offline tests or CI wiring (test does a real live send).
- Sending via Slack Web API / bot tokens (only the Incoming Webhook `SLACK_URL` is used).

#### Background & Context

- **Why needed**: a simple, runnable proof that the repo can post to Slack using the already-configured `SLACK_URL` secret.
- **Current state**: `SLACK_URL` exists in [.env](.env) and is forwarded to containers via `envVars: ["SLACK_URL"]` in [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js). No code consumes it yet.
- **Who is affected**: developers running the repo locally / in a HubLaunch container.

**Current Behavior**: No script sends Slack messages; `SLACK_URL` is unused by any code.

**Desired Behavior**: Running the sender posts `Welcome to my test` to the Slack webhook; running the test script verifies the post returns HTTP 200.

## Detailed Requirements

### Functional Requirements

1. **Sender (`scripts/send-slack.ts`)**
   - Read `process.env.SLACK_URL`.
   - If missing or empty (after trim): write `Error: SLACK_URL environment variable is not set` to `stderr` and `process.exit(1)`.
   - POST to `SLACK_URL` with header `Content-Type: application/json` and body `{"text":"Welcome to my test"}`.
   - On HTTP 200 and response body `ok`: log success to stdout, exit 0.
   - On any non-200 or body ≠ `ok`, or network error: write the status/body to stderr, exit 1.
   - Export an async function `sendSlackMessage(text: string): Promise<{ status: number; body: string }>` so the test can reuse it. Only run the CLI/`main()` path when the file is executed directly (not when imported).

2. **Test (`scripts/test-send-slack.ts`)**
   - Import `sendSlackMessage` from `./send-slack.ts`.
   - Guard: if `SLACK_URL` is unset, print a clear skip/error and exit 1 (cannot run a live HTTP test without it).
   - Call `sendSlackMessage("Welcome to my test")`.
   - Assert `status === 200` (HTTP status check per requirement). Treat body `ok` as the success confirmation.
   - Print `PASS` and exit 0 on success; print `FAIL: <reason>` and exit 1 otherwise.

### Technical Requirements

- **Language/Runtime**: TypeScript, executed by Node v24 native type-stripping (`node scripts/*.ts`). Global `fetch` (Node 18+).
- **Location**: new top-level `scripts/` directory. New `package.json` at repo root.
- **Dependencies**: none required at runtime. Optional dev fallback: `tsx` (only if run on Node < 22).
- **Constraints**: `.env` is gitignored and holds `SLACK_URL`; the scripts read from the process environment — they do NOT parse `.env` themselves. The caller is responsible for exporting `SLACK_URL` (e.g. `set -a; source .env; set +a`) or running inside the HubLaunch container that already forwards it.

### Non-Functional Requirements

- **Security**: never log the full `SLACK_URL` (it is a secret webhook). On error, log status/body only, not the URL. Do not commit `.env` (already gitignored).
- **Backwards Compatibility**: additive only — new files, no changes to existing bash scripts or config.
- **Error Handling**: fail-fast with non-zero exit codes and messages on stderr.

## Proposed Solution

**High-level approach**: Add a `scripts/` folder with two `.ts` files and a minimal root `package.json`. The sender uses global `fetch` to POST the Slack webhook payload; the test imports the sender's exported function and asserts on the HTTP status.

### Key Components

1. **`scripts/send-slack.ts`** — reusable `sendSlackMessage()` + a direct-run CLI guard.
2. **`scripts/test-send-slack.ts`** — live end-to-end test asserting HTTP 200.
3. **`package.json`** — `"type": "module"` + npm run scripts (`send`, `test:slack`).

### Files Likely to Change / Create

- `scripts/send-slack.ts` — NEW. Sender + exported function.
- `scripts/test-send-slack.ts` — NEW. Test harness.
- `package.json` — NEW. ESM module flag + convenience scripts.

### Code Patterns to Follow

- **Env-var-driven, fail-fast scripts**: mirror the style of existing bash scripts in [.github/scripts/](.github/scripts/) (e.g. `hula-read-config.sh`) which read env/config and exit non-zero on missing input. Replicate: check required var early, clear stderr message, non-zero exit.
- **`SLACK_URL` as a Slack Incoming Webhook**: payload shape is `{"text": "..."}`; success is HTTP 200 with body `ok`.

**Anti-Patterns to Avoid:**

- Do NOT add `axios`, `node-fetch`, or `dotenv` — Node v24 has `fetch`; the environment already supplies `SLACK_URL`.
- Do NOT hard-code or echo the webhook URL.
- Do NOT introduce a build/transpile pipeline; run `.ts` directly.

### Reference Implementations (for the implementing agent)

`scripts/send-slack.ts`:

```ts
const MESSAGE = "Welcome to my test";

export async function sendSlackMessage(
  text: string,
): Promise<{ status: number; body: string }> {
  const url = process.env.SLACK_URL?.trim();
  if (!url) {
    throw new Error("SLACK_URL environment variable is not set");
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const body = await res.text();
  return { status: res.status, body };
}

async function main(): Promise<void> {
  if (!process.env.SLACK_URL?.trim()) {
    console.error("Error: SLACK_URL environment variable is not set");
    process.exit(1);
  }
  try {
    const { status, body } = await sendSlackMessage(MESSAGE);
    if (status === 200 && body === "ok") {
      console.log(`Sent "${MESSAGE}" to Slack (HTTP ${status})`);
      process.exit(0);
    }
    console.error(`Slack send failed: HTTP ${status}, body: ${body}`);
    process.exit(1);
  } catch (err) {
    console.error(`Slack send error: ${(err as Error).message}`);
    process.exit(1);
  }
}

// Run main only when executed directly, not when imported by the test.
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
```

`scripts/test-send-slack.ts`:

```ts
import { sendSlackMessage } from "./send-slack.ts";

async function run(): Promise<void> {
  if (!process.env.SLACK_URL?.trim()) {
    console.error("FAIL: SLACK_URL not set — cannot run live test");
    process.exit(1);
  }
  try {
    const { status, body } = await sendSlackMessage("Welcome to my test");
    if (status === 200) {
      console.log(`PASS: HTTP ${status}, body: ${body}`);
      process.exit(0);
    }
    console.error(`FAIL: expected HTTP 200, got ${status}, body: ${body}`);
    process.exit(1);
  } catch (err) {
    console.error(`FAIL: ${(err as Error).message}`);
    process.exit(1);
  }
}

await run();
```

`package.json`:

```json
{
  "name": "test-hub-launch-scripts",
  "private": true,
  "type": "module",
  "scripts": {
    "send": "node scripts/send-slack.ts",
    "test:slack": "node scripts/test-send-slack.ts"
  }
}
```

> Note: `import.meta.url === \`file://${process.argv[1]}\`` is the ESM idiom for "run only if invoked directly." If the implementer finds the import path with the `.ts` extension is rejected on the target Node version, keep the `.ts` extension for Node v24 native stripping; only fall back to `tsx` (`npx tsx scripts/...`) if running on Node < 22.

## Implementation Steps

#### Phase 1: Setup

- [ ] Create root `package.json` with `"type": "module"` and the `send` / `test:slack` scripts (content above).
- [ ] Create the `scripts/` directory.

#### Phase 2: Sender

- [ ] Create `scripts/send-slack.ts` with the exported `sendSlackMessage()` and the direct-run `main()` guard (content above).
- [ ] Verify missing-`SLACK_URL` path prints the error to stderr and exits 1.

#### Phase 3: Test

- [ ] Create `scripts/test-send-slack.ts` importing `sendSlackMessage` and asserting HTTP 200 (content above).

#### Phase 4: Verify & Document

- [ ] Run the manual tests below.
- [ ] Add a short usage note to `README.md` (create if absent) covering how to export `SLACK_URL` and run both scripts.

## Edge Cases & Considerations

#### Edge Cases to Handle

1. **`SLACK_URL` unset/empty** → sender and test both print an error to stderr and exit 1.
2. **Non-200 response** (bad/expired webhook, e.g. Slack returns 404 `no_service`) → log status + body, exit 1.
3. **Network failure** (fetch throws) → caught, message logged, exit 1.
4. **Whitespace-only `SLACK_URL`** → treated as empty via `.trim()`, exit 1.

#### Potential Challenges

- ⚠️ **Node TS execution**: relies on Node ≥ 22 (repo has v24.11.1). On older Node, `node scripts/*.ts` fails — fallback is `npx tsx`. Documented in README.
- ⚠️ **`.env` not auto-loaded**: scripts read the process env only. The runner must export `SLACK_URL` first. Document the `set -a; source .env; set +a` one-liner.

#### Security Considerations

- `SLACK_URL` is a secret webhook — never log it; log only status/body on error.
- `.env` stays gitignored (already configured in [.gitignore](.gitignore)).

## Technical Considerations

#### Dependencies

- None required. Optional: `tsx@^4` as a dev fallback only if targeting Node < 22.

#### Environment Variables

- `SLACK_URL` — Slack Incoming Webhook URL. Already present in [.env](.env) and forwarded via `envVars: ["SLACK_URL"]` in [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js).

#### Error Handling Strategies

- Missing var → stderr message + `exit(1)`.
- Failed send → stderr status/body + `exit(1)`.
- Success → stdout confirmation + `exit(0)`.

## Testing Requirements

#### Manual Testing Checklist

1. **Setup**: export the var from `.env`:
   ```bash
   set -a; source .env; set +a
   ```
2. **Happy path — sender**:
   ```bash
   node scripts/send-slack.ts
   ```
   - Expected: stdout `Sent "Welcome to my test" to Slack (HTTP 200)`, exit 0, message visible in Slack.
3. **Happy path — test script**:
   ```bash
   node scripts/test-send-slack.ts
   ```
   - Expected: stdout `PASS: HTTP 200, body: ok`, exit 0.
4. **Missing var**:
   ```bash
   unset SLACK_URL; node scripts/send-slack.ts; echo "exit=$?"
   ```
   - Expected: stderr `Error: SLACK_URL environment variable is not set`, `exit=1`.
5. **Bad webhook**:
   ```bash
   SLACK_URL="https://hooks.slack.com/services/INVALID" node scripts/test-send-slack.ts; echo "exit=$?"
   ```
   - Expected: `FAIL: expected HTTP 200, got 404 ...`, `exit=1`.

#### Test Data Requirements

- A valid `SLACK_URL` in `.env` for the live happy-path tests (already present).

## Documentation Updates

- [ ] Create/append `README.md` with:
  - How to export `SLACK_URL` (`set -a; source .env; set +a`).
  - `node scripts/send-slack.ts` to send.
  - `node scripts/test-send-slack.ts` to test.
  - Note on Node ≥ 22 requirement / `tsx` fallback.

## Acceptance Criteria

- [ ] **AC1**: `node scripts/send-slack.ts` with a valid `SLACK_URL` posts `Welcome to my test` to Slack and exits 0.
- [ ] **AC2**: `node scripts/test-send-slack.ts` posts the message, prints `PASS` with HTTP 200, and exits 0.
- [ ] **AC3**: With `SLACK_URL` unset, both scripts print an error to stderr and exit 1.
- [ ] **AC4**: A non-200 webhook response causes exit 1 with the status logged.
- [ ] **AC5**: The webhook URL is never printed to stdout/stderr.
- [ ] **AC6**: No runtime npm dependencies added; scripts run via `node scripts/*.ts` on Node v24.
- [ ] **AC7**: `README.md` documents setup and usage.

#### Definition of Done

- All acceptance criteria met.
- Manual test checklist passes.
- No changes to existing bash scripts or config beyond additive new files.
- `.env` remains uncommitted.

## Dependencies & Related Work

#### Dependencies

- [ ] Valid `SLACK_URL` webhook (present in `.env`).
- [ ] Node ≥ 22 runtime (repo: v24.11.1).

#### Blockers

- None.

#### Related

- Config: `envVars: ["SLACK_URL"]` in [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js).
