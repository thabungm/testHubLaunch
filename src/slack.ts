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
/**
 * Normalize a raw SLACK_URL env value. Environment forwarding can wrap the value
 * in surrounding quotes and/or leave a trailing comma from the source .env line
 * (e.g. `"https://hooks.slack.com/...",`), which would make `fetch` fail to parse
 * the URL. Strip surrounding whitespace, a trailing comma, and wrapping quotes.
 */
function normalizeSlackUrl(raw: string): string {
  let url = raw.trim();
  if (url.endsWith(",")) url = url.slice(0, -1).trim();
  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim();
  }
  return url;
}

export async function sendContactToSlack(
  contact: Contact,
): Promise<{ status: number; body: string }> {
  const raw = process.env.SLACK_URL?.trim();
  if (!raw) {
    throw new Error("SLACK_URL environment variable is not set");
  }
  const url = normalizeSlackUrl(raw);
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
