const MESSAGE = "Welcome to my test";

export async function sendSlackMessage(
  text: string,
): Promise<{ status: number; body: string }> {
  const url = process.env.SLACK_URL?.trim();
  if (!url) {
    throw new Error("SLACK_URL environment variable is not set");
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const body = await res.text();
  return { status: res.status, body };
}

async function main(): Promise<void> {
  if (!process.env.SLACK_URL?.trim()) {
    console.error("Error: SLACK_URL environment variable is not set");
    process.exit(1);
  }
  try {
    const { status, body } = await sendSlackMessage(MESSAGE);
    if (status === 200 && body === "ok") {
      console.log(`Sent "${MESSAGE}" to Slack (HTTP ${status})`);
      process.exit(0);
    }
    console.error(`Slack send failed: HTTP ${status}, body: ${body}`);
    process.exit(1);
  } catch (err) {
    console.error(`Slack send error: ${(err as Error).message}`);
    process.exit(1);
  }
}

// Run main only when executed directly, not when imported by the test.
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
