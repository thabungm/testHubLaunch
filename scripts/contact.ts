/**
 * Contact Us feature — validate a submission and post it to Slack via SLACK_URL.
 *
 * Exposes a headless, reusable API (no web UI / HTTP server):
 *   - validateContact()   — synchronous, throws ContactValidationError on bad input
 *   - buildSlackPayload() — builds a Slack Block Kit message object
 *   - submitContactForm() — validate -> build -> POST to the Slack Incoming Webhook
 *
 * SLACK_URL is a Slack Incoming Webhook URL. Success = HTTP 200 with body "ok".
 * The webhook URL is a secret: it is never logged.
 */

export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  body: string;
}

/** Thrown when a submission fails validation. Carries every problem found. */
export class ContactValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(`Invalid contact submission: ${issues.join("; ")}`);
    this.name = "ContactValidationError";
    this.issues = issues;
  }
}

// Basic email shape: something@something.something, no spaces or extra @.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Validate a contact submission. Trims every field first. Collects ALL issues
 * (never stops at the first) and throws a ContactValidationError if any exist.
 * No network call is made here, so invalid input never reaches Slack.
 */
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

// Slack requires escaping these three characters in message text. Escaping also
// prevents malformed rendering and accidental @channel-style mentions.
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Build a Slack message object with a top-level `text` fallback (for
 * notifications/accessibility) plus a Block Kit `blocks` array:
 *   header  — "📬 New Contact: <subject>" (truncated to Slack's 150-char limit)
 *   section — Name / Email fields
 *   section — the message body (truncated below Slack's 3000-char section limit)
 * All user-provided values are escaped before embedding.
 */
export function buildSlackPayload(input: ContactInput): object {
  const name = esc(input.name.trim());
  const email = esc(input.email.trim());
  const subject = esc(input.subject.trim());
  const body = esc(input.body.trim());

  // Slack plain_text header limit is 150 chars; section text limit is 3000 —
  // leave headroom for the "*Message:*\n" label, so truncate the body to ~2900.
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

/**
 * Validate `input`, then POST a Block Kit message to the Slack Incoming Webhook
 * in SLACK_URL. Resolves with the raw HTTP status and body (Slack returns
 * 200 + "ok" on success). Throws before sending if SLACK_URL is unset or the
 * input is invalid. Network errors are allowed to reject so callers can report them.
 */
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

/** Direct-run smoke test: submits a fixed sample submission to Slack. */
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
    // Never log the webhook URL — only status/body.
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
