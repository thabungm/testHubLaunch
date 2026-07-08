export type ContactInput = {
  email: string;
  subject: string;
  body: string;
};

/**
 * Build the Slack message text for a contact-form submission.
 * Pure function (no I/O) so it can be unit-tested independently.
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
 * Send a contact-form submission to Slack via the Incoming Webhook at
 * `process.env.SLACK_URL`.
 *
 * Success contract (per the Slack Incoming Webhook API): the request succeeds
 * only when the response is HTTP 200 AND the response body is the literal
 * string `ok`. Anything else is treated as a failure and throws.
 *
 * SECURITY: `SLACK_URL` is a secret webhook. It is read only here (server-side)
 * and must NEVER be logged or included in an error message.
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
    throw new Error(
      `Slack request failed: HTTP ${res.status}, body: ${responseBody}`,
    );
  }
}
