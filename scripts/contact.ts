import { checkRateLimit, recordSuccess } from "./rate-limit.ts";

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

export class RateLimitError extends Error {
  email: string;
  limit: number;
  windowMs: number;
  retryAfterMs: number;
  constructor(email: string, limit: number, windowMs: number, retryAfterMs: number) {
    super(
      `Rate limit exceeded for ${email}: max ${limit} submissions per ${windowMs}ms. ` +
        `Try again in ${Math.ceil(retryAfterMs / 1000)}s.`,
    );
    this.name = "RateLimitError";
    this.email = email;
    this.limit = limit;
    this.windowMs = windowMs;
    this.retryAfterMs = retryAfterMs;
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

  validateContact(input); // throws ContactValidationError; no send on failure

  // Enforce the per-email rate limit before any network call. Only successful
  // (HTTP 200) sends consume quota, so the check reads state but records nothing.
  const now = Date.now();
  const breach = checkRateLimit(input.email, now);
  if (breach) {
    throw new RateLimitError(
      input.email.trim().toLowerCase(),
      breach.limit,
      breach.windowMs,
      breach.retryAfterMs,
    );
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildSlackPayload(input)),
  });
  if (res.status === 200) {
    recordSuccess(input.email, now);
  }
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
    } else if (err instanceof RateLimitError) {
      console.error(`Rate limited: ${err.message}`);
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
