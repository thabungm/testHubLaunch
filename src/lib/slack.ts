/**
 * Slack notification sender for the Contact Us form.
 *
 * `SLACK_URL` is a Slack **Incoming Webhook** URL and is a SECRET:
 *   - It is read ONLY here (server-side); never prefixed NEXT_PUBLIC_, never
 *     sent to the browser, and never included in any error message or log.
 * Success contract (per Slack Incoming Webhooks): HTTP 200 with the literal
 * response body `ok`. Anything else is treated as a failure.
 */

export type ContactInput = {
  email: string;
  subject: string;
  body: string;
};

/**
 * Build the Slack message text from a submission. Pure and side-effect free so
 * it can be unit-tested independently of the network call.
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
 * POST the formatted submission to the Slack Incoming Webhook in `SLACK_URL`.
 *
 * Throws if `SLACK_URL` is missing/empty, or if Slack responds with anything
 * other than HTTP 200 + body `ok`. The webhook URL is a secret and is NEVER
 * included in the thrown error (only the status/body are surfaced).
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
