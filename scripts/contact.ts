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

// Slack Incoming Webhooks are always https://hooks.slack.com/services/...
// Restricting the destination prevents the submission payload — which contains
// user-supplied PII (name, email, message) — from being sent to an arbitrary
// host, over plaintext http, or via a non-http scheme (SSRF).
const SLACK_WEBHOOK_HOST = "hooks.slack.com";

// Number of milliseconds to wait for Slack before aborting the request, so a
// hung endpoint cannot block the caller indefinitely.
const SLACK_REQUEST_TIMEOUT_MS = 10_000;

// Reads SLACK_URL from the environment, tolerates common .env quirks (surrounding
// quotes / a trailing comma), and validates it is a real Slack webhook URL.
export function resolveSlackWebhookUrl(): string {
  let url = process.env.SLACK_URL?.trim() ?? "";
  // Remove trailing comma first (may come before or after quotes)
  if (url.endsWith(",")) {
    url = url.slice(0, -1);
  }
  // Remove surrounding quotes if present
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1);
  }
  url = url.trim();
  if (!url) throw new Error("SLACK_URL environment variable is not set");

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("SLACK_URL is not a valid URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("SLACK_URL must use https");
  }
  if (parsed.hostname !== SLACK_WEBHOOK_HOST) {
    throw new Error(`SLACK_URL must point to ${SLACK_WEBHOOK_HOST}`);
  }
  return parsed.toString();
}

export async function submitContactForm(
  input: ContactInput,
): Promise<{ status: number; body: string }> {
  const url = resolveSlackWebhookUrl();

  validateContact(input); // throws ContactValidationError; no send on failure

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildSlackPayload(input)),
    signal: AbortSignal.timeout(SLACK_REQUEST_TIMEOUT_MS),
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
