# Landing Page + Contact Us Page with Slack Notification on Form Submit

## Problem Statement

This repository currently has **no web application** — only HubLaunch scaffolding (`.hublaunch/`, bash `hula-*.sh` scripts) and a single prior plan for a standalone Slack script. This plan adds a minimal web app with **two pages**:

1. **Landing Page** (`/`) — a placeholder that says the site is coming soon.
2. **Contact Us Page** (`/contact`) — a form with **email**, **subject**, and **body** fields. Submitting the form sends the contents to Slack via a Slack Incoming Webhook whose URL is provided by the `SLACK_URL` environment variable.

A test must exercise the Slack-notification-sending feature.

### Planning Context

> This section captures all decisions from planning so the implementing AI agent has full context. There is **no chat history** available to the implementer — everything needed is in this document.

**Key Requirements Discussed:**

- Two pages: a **Landing Page** and a **Contact Us** page.
- Landing Page content for now is just a welcome / "coming soon" message. No other functionality.
- Contact Us page has a form with exactly three inputs: **email**, **subject**, **body**.
- Submitting the form sends the form contents to **Slack**.
- The Slack destination URL is read from the `SLACK_URL` environment variable (a Slack **Incoming Webhook** URL — POST JSON `{"text": "..."}`, returns the literal string `ok` on success). This convention was established by the prior repo plan `2026-07-04-11:29-slack-welcome-message-script.md`.
- Write a **test** for the Slack-notification-sending feature.

**Decisions Made:**

- **Framework: Next.js 15 (App Router) + TypeScript.** Rationale: the feature is a website with two routable pages plus a server-side endpoint that must read a **secret** (`SLACK_URL`) and POST to Slack. Next.js App Router provides page routing, a server-side **Route Handler** for the form submission, and first-class TypeScript in a single minimal setup. The repo runs Node v24.11.1, which satisfies Next.js 15's Node ≥ 18.18 requirement.
- **`SLACK_URL` stays server-side — never sent to the browser.** `SLACK_URL` is a secret webhook. The browser form POSTs to a same-origin server Route Handler (`/api/contact`), and only that server code reads `process.env.SLACK_URL` and calls Slack. The variable is **not** prefixed `NEXT_PUBLIC_`, so Next.js will not inline it into client bundles.
- **Slack payload shape follows the prior plan:** `POST` with `Content-Type: application/json`, body `{"text": "..."}`; success = HTTP 200 with response body `ok`.
- **The message text** posted to Slack is a formatted summary of the three fields (see [Slack message format](#slack-message-format)).
- **Test approach: Vitest unit test with a mocked global `fetch`.** The Slack sender is factored into a standalone module (`src/lib/slack.ts`) exporting `sendSlackNotification(...)`. The test mocks `fetch` and asserts: (a) the request goes to `SLACK_URL`, (b) method/headers/payload are correct, (c) success on HTTP 200 + `ok`, (d) failure on non-200, (e) a thrown error when `SLACK_URL` is unset. This is deterministic and CI-safe (no live network). A **live** send is included only as a manual check.
- **Test runner: Vitest** (not Jest). Rationale: zero-config TypeScript/ESM support, fast, and does not require Babel. It is added as a dev dependency only.
- **Styling: minimal inline / basic CSS.** No UI library. Keep it small; visual polish is out of scope.

**Out of Scope:**

- Persisting contact submissions to a database.
- Email delivery (only Slack notification is required).
- Authentication, spam protection (captcha), or rate limiting on the form.
- Any real landing-page content beyond the "coming soon" message.
- Sending via the Slack Web API / bot tokens (only the Incoming Webhook `SLACK_URL` is used).
- Deployment/CI wiring (covered only by manual notes).

#### Background & Context

- **Why needed:** the repo needs a first web surface — a landing placeholder and a working contact form that notifies the team via Slack.
- **Current state:** no `package.json`, no framework, no `src/`. `SLACK_URL` exists in [.env](.env) and is forwarded to containers via `envVars: ["SLACK_URL"]` in [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js) but is unused by any code.
- **Who is affected:** developers running the app locally / in a HubLaunch container, and whoever receives the Slack channel messages.

**Current Behavior:** No web app exists; `SLACK_URL` is unused.

**Desired Behavior:** Visiting `/` shows a coming-soon message. Visiting `/contact` shows a form; submitting it posts a formatted message to the Slack webhook and shows the user a success or error state.

## Detailed Requirements

### Functional Requirements

1. **Landing Page (`/`)**
   - Renders a heading and a short message, e.g. **"Welcome — we're coming soon."**
   - Includes a link to the Contact Us page (`/contact`).
   - No form, no data fetching. Static content.

2. **Contact Us Page (`/contact`)**
   - Renders a form with three fields:
     - `email` — `<input type="email">`, required.
     - `subject` — `<input type="text">`, required.
     - `body` — `<textarea>`, required.
   - A submit button labeled "Send".
   - On submit, the form POSTs `{ email, subject, body }` as JSON to the server Route Handler `POST /api/contact`.
   - While the request is in flight, the button is disabled and shows a "Sending…" state.
   - On success (HTTP 200 from `/api/contact`): show a success message (e.g. "Thanks! Your message was sent.") and clear the form.
   - On failure (non-200 from `/api/contact`): show an error message (e.g. "Something went wrong. Please try again.").
   - **Client-side validation:** all three fields required and non-empty (after trim); email must match a basic email pattern (rely on `type="email"` + a `required` check). Do not submit if invalid.

3. **Contact API Route Handler (`POST /api/contact`)** — server-side (`src/app/api/contact/route.ts`)
   - Parse the JSON request body into `{ email, subject, body }`.
   - **Server-side validation:** all three fields present, strings, non-empty after trim. If invalid, respond `400` with `{ error: "Missing or invalid fields" }`.
   - Read the Slack destination from `process.env.SLACK_URL`.
   - Call `sendSlackNotification({ email, subject, body })` from `src/lib/slack.ts`.
   - On success respond `200` with `{ ok: true }`.
   - On Slack failure (non-200/`ok`) or thrown error, respond `502` with `{ error: "Failed to send notification" }` and log the server-side error (status/body only — never the URL).
   - This handler must run on the **Node.js runtime** (default for Route Handlers) so `process.env.SLACK_URL` is available and requests are server-to-server.

4. **Slack sender module (`src/lib/slack.ts`)**
   - Export `async function sendSlackNotification(input: ContactInput): Promise<void>` where `ContactInput = { email: string; subject: string; body: string }`.
   - Read `const url = process.env.SLACK_URL?.trim()`. If missing/empty, `throw new Error("SLACK_URL environment variable is not set")`.
   - Build the message text (see [Slack message format](#slack-message-format)).
   - `POST` to `url` with header `Content-Type: application/json` and body `JSON.stringify({ text })`.
   - Read the response body as text. If `res.status !== 200` OR body `!== "ok"`, `throw new Error(...)` with the status (do **not** include the URL).
   - Return `void` on success.
   - Export the `ContactInput` type and a pure helper `formatSlackText(input: ContactInput): string` so the test can assert the formatting independently.

#### Slack message format

`formatSlackText` returns a single string, for example:

```
:incoming_envelope: New contact form submission
*From:* alice@example.com
*Subject:* Hello there
*Message:*
This is the body text.
```

Exact template (implement literally):

```ts
export function formatSlackText({ email, subject, body }: ContactInput): string {
  return [
    ":incoming_envelope: New contact form submission",
    `*From:* ${email}`,
    `*Subject:* ${subject}`,
    "*Message:*",
    body,
  ].join("\n");
}
```

### Technical Requirements

- **Language/Runtime:** TypeScript on Node v24.11.1. Next.js 15 (App Router), React 19.
- **HTTP to Slack:** global `fetch` (built into Node 18+). Do **not** add `axios` / `node-fetch`.
- **Location:** new top-level Next.js project rooted at the repo root:
  - `src/app/page.tsx` — Landing Page.
  - `src/app/contact/page.tsx` — Contact Us page (client component).
  - `src/app/api/contact/route.ts` — Route Handler.
  - `src/lib/slack.ts` — Slack sender + formatter.
  - `src/lib/slack.test.ts` — Vitest test.
  - `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`.
- **Dependencies (runtime):** `next`, `react`, `react-dom`. **(dev):** `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `vitest`.
- **Constraints:** `.env` is gitignored and holds `SLACK_URL`. Next.js **auto-loads `.env`** for `next dev`/`next build`, so `process.env.SLACK_URL` is populated locally without extra tooling. The Slack module reads only from `process.env` — it does not parse `.env` itself.

### Non-Functional Requirements

- **Security:** `SLACK_URL` is a secret webhook. It is read **only** in server code (`route.ts` → `slack.ts`), is never prefixed `NEXT_PUBLIC_`, and is never sent to the client or logged. On error, log status/body only — never the URL.
- **Backwards Compatibility:** additive only — new files. Does not touch existing bash scripts, config, or the prior plan's (not-yet-created) `scripts/`.
- **Error Handling:** validation returns `400`; Slack/network failure returns `502`; both are surfaced to the user as a generic error message. All failures use non-2xx HTTP responses (no unhandled promise rejections).
- **Performance:** not a concern at this scale; no caching needed.

## Proposed Solution

**High-level approach:** Scaffold a minimal Next.js 15 App Router app. The Landing Page is static. The Contact page is a client component that POSTs the form JSON to a server Route Handler. The Route Handler validates input and delegates to a small server-only `slack.ts` module that POSTs the Slack webhook. The Slack module is intentionally isolated so it can be unit-tested with a mocked `fetch`.

### Key Components

1. **`src/lib/slack.ts`** — the testable core. `formatSlackText()` (pure) + `sendSlackNotification()` (does the `fetch`). Reads `process.env.SLACK_URL`. This is the "Slack notification sending feature" the test targets.
2. **`src/app/api/contact/route.ts`** — server Route Handler; validation + delegation to `slack.ts`; maps outcomes to HTTP status codes.
3. **`src/app/contact/page.tsx`** — client component with the form, submit handler, and success/error UI states.
4. **`src/app/page.tsx`** + **`src/app/layout.tsx`** — landing page and root layout.

### Files to Create

- `package.json` — NEW. Next.js + Vitest scripts and deps.
- `tsconfig.json` — NEW. Standard Next.js TS config.
- `next.config.ts` — NEW. Minimal (can be `export default {}`).
- `vitest.config.ts` — NEW. Node test environment.
- `src/app/layout.tsx` — NEW. Root layout (`<html><body>`).
- `src/app/page.tsx` — NEW. Landing page.
- `src/app/contact/page.tsx` — NEW. Contact form (client component).
- `src/app/api/contact/route.ts` — NEW. POST handler.
- `src/lib/slack.ts` — NEW. `sendSlackNotification` + `formatSlackText` + `ContactInput`.
- `src/lib/slack.test.ts` — NEW. Vitest unit tests (mock `fetch`).
- `.env.example` — NEW. Documents `SLACK_URL` without a real value.
- `README.md` — NEW/append. Setup + run + test instructions.

### Code Patterns to Follow

- **Slack conventions** come from the prior plan [`.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md`](.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md): native `fetch`, `POST {"text":...}`, success = HTTP 200 + body `ok`, never log the URL, fail-fast when `SLACK_URL` is missing. Reuse these exactly.
- **Env forwarding** already declared: `envVars: ["SLACK_URL"]` in [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js). No config change needed.

**Anti-Patterns to Avoid:**

- Do **NOT** read `SLACK_URL` in any client component or expose it via `NEXT_PUBLIC_`. The webhook must never reach the browser.
- Do **NOT** POST to Slack directly from the browser (leaks the webhook + CORS issues). Always go through `/api/contact`.
- Do **NOT** add `axios`, `node-fetch`, or `dotenv` — Node v24 has `fetch`; Next.js loads `.env` automatically.
- Do **NOT** log the webhook URL anywhere.

### Reference Implementations (for the implementing agent)

`src/lib/slack.ts`:

```ts
export type ContactInput = {
  email: string;
  subject: string;
  body: string;
};

export function formatSlackText({ email, subject, body }: ContactInput): string {
  return [
    ":incoming_envelope: New contact form submission",
    `*From:* ${email}`,
    `*Subject:* ${subject}`,
    "*Message:*",
    body,
  ].join("\n");
}

export async function sendSlackNotification(input: ContactInput): Promise<void> {
  const url = process.env.SLACK_URL?.trim();
  if (!url) {
    throw new Error("SLACK_URL environment variable is not set");
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: formatSlackText(input) }),
  });
  const responseBody = await res.text();
  if (res.status !== 200 || responseBody !== "ok") {
    // Never include `url` in the error — it is a secret webhook.
    throw new Error(`Slack request failed: HTTP ${res.status}, body: ${responseBody}`);
  }
}
```

`src/app/api/contact/route.ts`:

```ts
import { NextResponse } from "next/server";
import { sendSlackNotification, type ContactInput } from "@/lib/slack";

export async function POST(request: Request): Promise<Response> {
  let data: Partial<ContactInput>;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = data.email?.trim();
  const subject = data.subject?.trim();
  const body = data.body?.trim();
  if (!email || !subject || !body) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  try {
    await sendSlackNotification({ email, subject, body });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("Contact notification failed:", (err as Error).message);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 502 });
  }
}
```

`src/app/page.tsx` (Landing):

```tsx
import Link from "next/link";

export default function LandingPage() {
  return (
    <main style={{ maxWidth: 640, margin: "4rem auto", fontFamily: "system-ui" }}>
      <h1>Welcome</h1>
      <p>We&apos;re coming soon.</p>
      <p>
        <Link href="/contact">Contact us</Link>
      </p>
    </main>
  );
}
```

`src/app/contact/page.tsx` (Contact form — client component):

```tsx
"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactPage() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !subject.trim() || !body.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, body }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
        setSubject("");
        setBody("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "4rem auto", fontFamily: "system-ui" }}>
      <h1>Contact Us</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="subject">Subject</label>
          <input id="subject" type="text" required value={subject}
            onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label htmlFor="body">Message</label>
          <textarea id="body" required value={body}
            onChange={(e) => setBody(e.target.value)} />
        </div>
        <button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Send"}
        </button>
      </form>
      {status === "success" && <p>Thanks! Your message was sent.</p>}
      {status === "error" && <p>Something went wrong. Please try again.</p>}
    </main>
  );
}
```

`src/app/layout.tsx`:

```tsx
export const metadata = { title: "testHubLaunch" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`src/lib/slack.test.ts` (Vitest — the required test for the Slack feature):

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatSlackText, sendSlackNotification } from "./slack";

const INPUT = { email: "a@b.com", subject: "Hi", body: "Hello world" };

describe("formatSlackText", () => {
  it("includes all three fields", () => {
    const text = formatSlackText(INPUT);
    expect(text).toContain("a@b.com");
    expect(text).toContain("Hi");
    expect(text).toContain("Hello world");
  });
});

describe("sendSlackNotification", () => {
  const OLD_ENV = process.env.SLACK_URL;

  beforeEach(() => {
    process.env.SLACK_URL = "https://hooks.slack.com/services/TEST/HOOK/URL";
  });

  afterEach(() => {
    process.env.SLACK_URL = OLD_ENV;
    vi.restoreAllMocks();
  });

  it("POSTs the webhook with the correct payload and resolves on 200 + ok", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("ok", { status: 200 }));

    await expect(sendSlackNotification(INPUT)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, options] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe("https://hooks.slack.com/services/TEST/HOOK/URL");
    expect(options?.method).toBe("POST");
    expect((options?.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    const sent = JSON.parse(options?.body as string);
    expect(sent.text).toContain("a@b.com");
    expect(sent.text).toContain("Hi");
    expect(sent.text).toContain("Hello world");
  });

  it("throws when Slack returns a non-200 status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("no_service", { status: 404 }),
    );
    await expect(sendSlackNotification(INPUT)).rejects.toThrow(/HTTP 404/);
  });

  it("throws when the response body is not 'ok'", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("invalid_payload", { status: 200 }),
    );
    await expect(sendSlackNotification(INPUT)).rejects.toThrow();
  });

  it("throws when SLACK_URL is not set", async () => {
    delete process.env.SLACK_URL;
    await expect(sendSlackNotification(INPUT)).rejects.toThrow(/SLACK_URL/);
  });

  it("never leaks the webhook URL in the error message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("fail", { status: 500 }),
    );
    // `toThrow` only matches substrings/regex/Error — assert the negative by
    // catching the error and inspecting its message directly.
    let caught: Error | undefined;
    try {
      await sendSlackNotification(INPUT);
    } catch (err) {
      caught = err as Error;
    }
    expect(caught).toBeDefined();
    expect(caught?.message).not.toContain("hooks.slack.com");
    expect(caught?.message).not.toContain("TEST/HOOK/URL");
  });
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

`package.json` (key parts — the implementer should pin to the latest stable versions available at install time; the ranges below are a guide):

```json
{
  "name": "test-hub-launch-web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "vitest": "^2.1.0"
  }
}
```

`tsconfig.json` must map `@/*` to `src/*` (`"paths": { "@/*": ["./src/*"] }`, `"baseUrl": "."`) so the `@/lib/slack` import in `route.ts` resolves. Use the standard Next.js `tsconfig.json` (Next generates one on first `next dev` if absent; the implementer may run `npx create-next-app` non-interactively or write the files by hand — either is acceptable as long as the file list above exists and `npm run build` succeeds).

## Implementation Steps

#### Phase 1: Project Scaffold — Priority: Critical, Complexity: Simple

- [ ] Create `package.json` with the deps and scripts above; run `npm install`.
- [ ] Create `tsconfig.json` (Next.js standard) including `baseUrl: "."` and `paths: { "@/*": ["./src/*"] }`.
- [ ] Create `next.config.ts` (`export default {}`).
- [ ] Create `.env.example` documenting `SLACK_URL` (no real value).
- [ ] Verify `.env` is gitignored (already the case in [.gitignore](.gitignore)) and confirm `next dev` reads `SLACK_URL` from it.

#### Phase 2: Slack Feature (testable core) — Priority: Critical, Complexity: Simple

- [ ] Create `src/lib/slack.ts` with `ContactInput`, `formatSlackText`, `sendSlackNotification` (content above).

#### Phase 3: Pages & API — Priority: High, Complexity: Medium

- [ ] Create `src/app/layout.tsx` (root layout).
- [ ] Create `src/app/page.tsx` (Landing Page — coming soon + link to `/contact`).
- [ ] Create `src/app/contact/page.tsx` (client component form; success/error/sending states).
- [ ] Create `src/app/api/contact/route.ts` (validation + `sendSlackNotification` + status mapping).

#### Phase 4: Test — Priority: Critical, Complexity: Simple

- [ ] Create `vitest.config.ts`.
- [ ] Create `src/lib/slack.test.ts` (content above).
- [ ] Run `npm test` and confirm all cases pass with `fetch` mocked (no live network).

#### Phase 5: Verify & Document — Priority: Medium, Complexity: Simple

- [ ] Run `npm run build` — must compile with no type errors.
- [ ] Run the manual testing checklist below.
- [ ] Write `README.md` (setup, run, test, `SLACK_URL` note).

## Edge Cases & Considerations

#### Edge Cases to Handle

1. **`SLACK_URL` unset/empty** → `sendSlackNotification` throws; `/api/contact` returns `502`; the form shows the generic error. (Covered by a unit test.)
2. **Missing/empty form fields** → client blocks submit; server also returns `400` (defense in depth). (Covered by a unit test on validation via the handler, optional.)
3. **Slack returns non-200 (bad/expired webhook, e.g. 404 `no_service`)** → throws; `502` to client. (Covered by a unit test.)
4. **Slack returns 200 but body ≠ `ok`** → treated as failure; throws. (Covered by a unit test.)
5. **Network failure (`fetch` rejects)** → error propagates to the handler `catch`; `502` to client.
6. **Whitespace-only `SLACK_URL`** → `.trim()` makes it empty → throws.
7. **Malformed JSON body to `/api/contact`** → `400 Invalid JSON`.

#### Potential Challenges

- ⚠️ **Secret leakage:** the single most important constraint — `SLACK_URL` must never be read in client code, prefixed `NEXT_PUBLIC_`, or logged. Enforced by reading it only in `src/lib/slack.ts` (imported only by the server route) and by the "never leaks URL" unit test.
- ⚠️ **Route Handler runtime:** ensure the handler runs on the Node.js runtime (the default). Do not set `export const runtime = "edge"` — that would change `fetch`/env behavior unnecessarily.
- ⚠️ **Version drift:** Next.js 15 / React 19 must be mutually compatible; install them together and let `npm` resolve. If `create-next-app` is used, accept its generated versions.

#### Security Considerations

- `SLACK_URL` is a secret webhook: server-only, never logged, never in client bundles.
- No secrets committed: `.env` stays gitignored; only `.env.example` (no value) is committed.
- Basic input validation on the server prevents empty/garbage submissions from hitting Slack.

## Technical Considerations

#### Dependencies

- Runtime: `next`, `react`, `react-dom`. Dev: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `vitest`. No HTTP library — native `fetch`.

#### Configuration Changes

- No change to [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js) — `envVars: ["SLACK_URL"]` already forwards the webhook.

#### Environment Variables

- `SLACK_URL` — Slack Incoming Webhook URL. Already present in [.env](.env) and forwarded via `envVars: ["SLACK_URL"]`. Next.js auto-loads `.env` for `dev`/`build`/`start`. Document in `.env.example`.

#### Error Handling Strategies

- Slack module: throw on missing env / non-200 / body ≠ `ok`.
- API route: `400` on invalid input, `502` on Slack failure, `200` on success; log status/body (never URL).
- Client: show a generic success or error message; never surface internal error details.

## Testing Requirements

#### Unit Tests (`src/lib/slack.test.ts` — the required Slack-feature test)

- [ ] `formatSlackText` includes email, subject, and body.
- [ ] `sendSlackNotification` POSTs to `SLACK_URL` with `method: POST`, `Content-Type: application/json`, and body `{ text }` containing all three fields; resolves on HTTP 200 + `ok`.
- [ ] Throws on non-200 status (e.g. 404).
- [ ] Throws when the body is not `ok`.
- [ ] Throws when `SLACK_URL` is unset.
- [ ] Error message never contains `hooks.slack.com` (URL not leaked).
- [ ] All external HTTP is mocked via `vi.spyOn(globalThis, "fetch")` — no live network.

#### Integration Tests (optional, nice-to-have)

- [ ] Test `POST /api/contact` handler: mock `sendSlackNotification`, assert `200` on valid input, `400` on missing fields, `502` when the sender throws. (Import and call the exported `POST` with a `Request`.)

#### Manual Testing Checklist

1. **Setup:** ensure `.env` has a valid `SLACK_URL`, then `npm install`.
2. **Run dev server:** `npm run dev`, open `http://localhost:3000`.
   - Expected: Landing page shows "Welcome — we're coming soon" and a Contact link.
3. **Landing → Contact:** click the link → `/contact` renders the form (email, subject, body, Send).
4. **Happy path submit:** fill valid values, click Send.
   - Expected: button shows "Sending…", then "Thanks! Your message was sent."; a formatted message appears in the Slack channel.
5. **Validation:** submit with an empty field.
   - Expected: browser blocks submit (required); no request sent.
6. **Failure path:** temporarily set `SLACK_URL` to an invalid webhook, restart dev, submit.
   - Expected: "Something went wrong. Please try again."; server logs a `502`/failure (without the URL).
7. **Automated test:** `npm test` → all Vitest cases pass.
8. **Build:** `npm run build` → compiles with no type errors.

#### Test Data Requirements

- Unit tests need no live `SLACK_URL` (fetch is mocked; the test sets a dummy value).
- Manual happy-path needs the real `SLACK_URL` in `.env` (already present).

## Documentation Updates

- [ ] Create `README.md` with:
  - Prerequisites (Node ≥ 18.18; repo has v24.11.1).
  - `npm install`.
  - `npm run dev` and the two page URLs (`/`, `/contact`).
  - How `SLACK_URL` is supplied (via `.env`, auto-loaded by Next.js) — reference `.env.example`.
  - `npm test` to run the Slack notification tests.
  - Note that `SLACK_URL` is a secret and is used server-side only.
- [ ] Add JSDoc/inline comments on `sendSlackNotification` explaining the success contract (HTTP 200 + body `ok`) and the "never log the URL" rule.

## Acceptance Criteria

- [ ] **AC1**: Visiting `/` renders a "Welcome — we're coming soon" message and a link to `/contact`.
- [ ] **AC2**: Visiting `/contact` renders a form with email, subject, and body fields plus a Send button.
- [ ] **AC3**: Submitting a valid form POSTs to `/api/contact`, which posts a formatted message containing the email, subject, and body to the Slack webhook at `SLACK_URL`; the user sees a success message.
- [ ] **AC4**: `SLACK_URL` is read only in server code, is never prefixed `NEXT_PUBLIC_`, never appears in the client bundle, and is never logged.
- [ ] **AC5**: When Slack returns a non-200 (or body ≠ `ok`), or `SLACK_URL` is unset, `/api/contact` returns `502` and the user sees a generic error message.
- [ ] **AC6**: `npm test` runs the Vitest suite in `src/lib/slack.test.ts` with `fetch` mocked, and all cases pass (payload correctness, success, non-200 failure, body-not-ok failure, missing-env, no-URL-leak).
- [ ] **AC7**: `npm run build` compiles with no TypeScript errors.
- [ ] **AC8**: No secrets are committed; `.env` stays gitignored and only `.env.example` (no value) is added.

#### Definition of Done

- All acceptance criteria met.
- `npm test` and `npm run build` pass.
- Manual testing checklist verified (at least the happy path and the failure path).
- No changes to existing HubLaunch bash scripts or config beyond additive new files.
- `.env` remains uncommitted.

## Dependencies & Related Work

#### Dependencies

- [ ] Valid `SLACK_URL` webhook for manual happy-path testing (present in [.env](.env)).
- [ ] Node ≥ 18.18 runtime (repo has v24.11.1).

#### Blockers

- None.

#### Related

- Slack conventions established by [`.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md`](.hublaunch/plans/2026-07-04-11:29-slack-welcome-message-script.md).
- Env forwarding: `envVars: ["SLACK_URL"]` in [.hublaunch/hublaunch.config.js](.hublaunch/hublaunch.config.js).
