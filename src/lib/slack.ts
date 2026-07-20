/**
 * Slack notification sender for the Contact Us form.
 *
 * `SLACK_URL` is a Slack Incoming Webhook URL and is a SECRET. It is read only
 * here (server-side), is never prefixed `NEXT_PUBLIC_`, is never sent to the
 * browser, and is never included in any thrown error or log line.
 *
 * Success contract (per Slack Incoming Webhooks): the request succeeds only when
 * the response is HTTP 200 AND the response body is the literal string `ok`.
 */

export type ContactInput = {
  email: string;
  subject: string;
  body: string;
};

/**
 * Pure formatter: turns a contact submission into the Slack message text.
 * Exported separately so it can be unit-tested without any network call.
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
 * Resolves to `void` on success (HTTP 200 + body `ok`). Throws if `SLACK_URL`
 * is unset/empty, or if Slack responds with a non-200 status or a body other
 * than `ok`. The webhook URL is NEVER included in the error message.
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
