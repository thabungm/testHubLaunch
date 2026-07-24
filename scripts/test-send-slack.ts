import { sendSlackMessage } from "./send-slack.ts";

async function run(): Promise<void> {
  if (!process.env.SLACK_URL?.trim()) {
    console.error("FAIL: SLACK_URL not set — cannot run live test");
    process.exit(1);
  }
  try {
    const { status, body } = await sendSlackMessage("Welcome to my test");
    if (status === 200) {
      console.log(`PASS: HTTP ${status}, body: ${body}`);
      process.exit(0);
    }
    console.error(`FAIL: expected HTTP 200, got ${status}, body: ${body}`);
    process.exit(1);
  } catch (err) {
    console.error(`FAIL: ${(err as Error).message}`);
    process.exit(1);
  }
}

await run();
