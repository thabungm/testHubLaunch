import { NextResponse } from "next/server";
import { sendSlackNotification, type ContactInput } from "@/lib/slack";

// Run on the Node.js runtime (default for Route Handlers) so process.env.SLACK_URL
// is available and the Slack call is server-to-server.

export async function POST(request: Request): Promise<Response> {
  let data: Partial<ContactInput>;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = data.email?.trim();
  const subject = data.subject?.trim();
  const body = data.body?.trim();
  if (!email || !subject || !body) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  try {
    await sendSlackNotification({ email, subject, body });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    // Log status/body only — never the webhook URL.
    console.error("Contact notification failed:", (err as Error).message);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 502 });
  }
}
