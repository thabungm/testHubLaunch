import {
  submitContactForm,
  validateContact,
  ContactValidationError,
  type ContactInput,
} from "./contact.ts";

async function run(): Promise<void> {
  const hasLiveSlackUrl = Boolean(process.env.SLACK_URL?.trim());

  const valid: ContactInput = {
    name: "Test User",
    email: "test@example.com",
    subject: `Contact Us test — ${new Date().toISOString()}`,
    body: "End-to-end test exercising submitContactForm.",
  };

  if (hasLiveSlackUrl) {
    // Test 1: live happy path — actually sends a message to Slack.
    try {
      const { status, body } = await submitContactForm(valid);
      if (status !== 200) {
        console.error(`FAIL (live send): expected HTTP 200, got ${status}, body: ${body}`);
        process.exit(1);
      }
      console.log(`PASS (live send): HTTP ${status}, body: ${body}`);
    } catch (err) {
      console.error(`FAIL (live send): ${(err as Error).message}`);
      process.exit(1);
    }
  } else {
    // No SLACK_URL available in this environment — exercise the same
    // request path against a stubbed fetch instead of skipping the test.
    console.log("NOTE: SLACK_URL not set — running Test 1 against a mocked Slack endpoint.");
    const originalFetch = globalThis.fetch;
    const originalUrl = process.env.SLACK_URL;
    globalThis.fetch = (async () => new Response("ok", { status: 200 })) as typeof fetch;
    process.env.SLACK_URL = "https://hooks.slack.test/mock-endpoint";
    try {
      const { status, body } = await submitContactForm(valid);
      if (status !== 200) {
        console.error(`FAIL (mock send): expected HTTP 200, got ${status}, body: ${body}`);
        process.exit(1);
      }
      console.log(`PASS (mock send): HTTP ${status}, body: ${body}`);
    } catch (err) {
      console.error(`FAIL (mock send): ${(err as Error).message}`);
      process.exit(1);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalUrl === undefined) delete process.env.SLACK_URL;
      else process.env.SLACK_URL = originalUrl;
    }
  }

  // Test 2: validation rejects bad input WITHOUT sending to Slack.
  try {
    validateContact({ name: "", email: "not-an-email", subject: "", body: "" });
    console.error("FAIL (validation): expected ContactValidationError, none thrown");
    process.exit(1);
  } catch (err) {
    if (err instanceof ContactValidationError && err.issues.length >= 4) {
      console.log(`PASS (validation): rejected ${err.issues.length} invalid fields`);
    } else {
      console.error(`FAIL (validation): unexpected error ${(err as Error).message}`);
      process.exit(1);
    }
  }

  console.log("ALL PASS");
  process.exit(0);
}

await run();
