/**
 * Slack notification sender for the Contact form.
 *
 * SLACK_URL is a Slack Incoming Webhook URL and is a SECRET:
 *   - It is read ONLY here (server-only module, imported only by the
 *     /api/contact Route Handler). It is never prefixed NEXT_PUBLIC_ and
 *     never reaches the browser.
 *   - It is NEVER logged or included in thrown error messages.
 *
 * Success contract (matches the Slack Incoming Webhook API): a successful send
 * returns HTTP 200 with the literal response body "ok". Anything else is a
 * failure.
 */

export type ContactInput = {
  email: string;
  subject: string;
  body: string;
};

/** Pure formatter — builds the Slack message text from the three fields. */
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
 * POST the contact submission to the Slack Incoming Webhook at SLACK_URL.
 *
 * Resolves with void on success (HTTP 200 + body "ok"). Throws if SLACK_URL is
 * missing/empty, on a non-200 status, or when the response body is not "ok".
 * The webhook URL is a secret and is never included in the error message.
 */
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
