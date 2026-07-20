/**
 * Slack sender for the Contact Us web form.
 *
 * Exposes a single reusable function, `sendContactToSlack()`, that composes a
 * message from the three contact-form fields and POSTs it to the Slack Incoming
 * Webhook stored in the SLACK_URL environment variable.
 *
 * SLACK_URL is a secret: it is never logged. Success = HTTP 200 with body "ok".
 */

export interface Contact {
  email: string;
  subject: string;
  body: string;
}

/**
 * Post a contact-form submission to Slack via the SLACK_URL Incoming Webhook.
 * Returns the HTTP status and response body. Throws if SLACK_URL is unset.
 * Never logs the webhook URL.
 */
export async function sendContactToSlack(
  contact: Contact,
): Promise<{ status: number; body: string }> {
  const url = process.env.SLACK_URL?.trim();
  if (!url) {
    throw new Error("SLACK_URL environment variable is not set");
  }
  const text = [
    "New contact form submission",
    `*Email:* ${contact.email}`,
    `*Subject:* ${contact.subject}`,
    "*Body:*",
    contact.body,
  ].join("\n");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const body = await res.text();
  return { status: res.status, body };
}
