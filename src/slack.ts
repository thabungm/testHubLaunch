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
  // Normalize the env value: some environments inject it with wrapping quotes
  // and/or a trailing comma (e.g. copied from a JSON/JS config line). A clean
  // webhook URL contains none of these characters, so stripping them is safe.
  const url = process.env.SLACK_URL?.trim()
    .replace(/,+$/, "")
    .trim()
    .replace(/^["']|["']$/g, "");
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
