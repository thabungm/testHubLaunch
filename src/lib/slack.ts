/**
 * Slack notification sender for the Contact form.
 *
 * `SLACK_URL` is a Slack Incoming Webhook URL and is a SECRET:
 *   - It is read ONLY here (server-side), never in client code, and is never
 *     prefixed `NEXT_PUBLIC_`, so it never reaches the browser bundle.
 *   - It is NEVER logged or included in thrown error messages.
 *
 * Success contract (per the Slack Incoming Webhook API): a successful send is
 * HTTP 200 with the response body being the literal string `ok`.
 */

export type ContactInput = {
  email: string;
  subject: string;
  body: string;
};

/**
 * Build the plain-text Slack message for a contact submission.
 * Pure (no I/O) so it can be unit-tested independently.
 */
export function formatSlackText({ email, subject, body }: ContactInput): string {
  return [
    ":incoming_envelope: New contact form submission",
    `*From:* ${email}`,
    `*Subject:* ${subject}`,
    "*Message:*",
    body,
  ].join("\n");
}

/**
 * POST a formatted contact submission to the Slack Incoming Webhook in
 * `process.env.SLACK_URL`.
 *
 * Throws if `SLACK_URL` is missing/empty, or if Slack does not return the
 * success contract (HTTP 200 + body `ok`). The webhook URL is a secret and is
 * never included in the thrown error.
 */
export async function sendSlackNotification(input: ContactInput): Promise<void> {
  // Some env-forwarding setups deliver the value wrapped in quotes and/or a
  // trailing comma (e.g. copied from a JS/JSON array literal). Next.js strips
  // quotes when loading `.env`, but a directly-forwarded process env var is not
  // sanitized — so strip surrounding quotes/commas/whitespace here. A clean URL
  // is left untouched.
  const url = process.env.SLACK_URL?.trim().replace(/^['"]+|['",\s]+$/g, "");
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
