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

// Slack Incoming Webhooks always live on this host. Restricting the destination
// to it prevents a misconfigured or injected SLACK_URL from turning this into an
// SSRF sink or exfiltrating the submitter's PII (name/email/message) to an
// arbitrary endpoint. See README: SLACK_URL must be a Slack webhook URL.
const SLACK_WEBHOOK_HOST = "hooks.slack.com";

/**
 * Read SLACK_URL from the environment and validate it is a well-formed HTTPS
 * Slack webhook URL. Throws a generic Error on any problem — deliberately
 * WITHOUT echoing the URL value, so the secret webhook is never leaked into
 * logs or error output.
 */
export function resolveSlackUrl(): string {
  let url = process.env.SLACK_URL?.trim() ?? "";
  // Remove trailing comma first (may come before or after quotes)
  if (url.endsWith(",")) {
    url = url.slice(0, -1);
  }
  // Remove surrounding quotes if present
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1);
  }
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
    throw new Error(`SLACK_URL must be a ${SLACK_WEBHOOK_HOST} webhook URL`);
  }
  return parsed.toString();
}

// Abort the Slack request if it hangs, so a stuck endpoint cannot block the
// process indefinitely.
const SLACK_TIMEOUT_MS = 10_000;

export async function submitContactForm(
  input: ContactInput,
): Promise<{ status: number; body: string }> {
  const url = resolveSlackUrl();

  validateContact(input); // throws ContactValidationError; no send on failure

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildSlackPayload(input)),
    signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
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
