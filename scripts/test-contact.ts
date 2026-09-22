import {
  submitContactForm,
  validateContact,
  ContactValidationError,
  type ContactInput,
} from "./contact.ts";

async function run(): Promise<void> {
  if (!process.env.SLACK_URL?.trim()) {
    console.error("FAIL: SLACK_URL not set — cannot run live test");
    process.exit(1);
  }

  // Test 1: live happy path — actually sends a message to Slack.
  const valid: ContactInput = {
    name: "Test User",
    email: "test@example.com",
    subject: `Contact Us test — ${new Date().toISOString()}`,
    body: "Live end-to-end test sending a real Slack message via SLACK_URL.",
  };
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

  // Test 3: retry — fails twice with a retryable error, succeeds on the 3rd attempt.
  {
    const realFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = (async (..._args: Parameters<typeof fetch>) => {
      callCount++;
      if (callCount < 3) {
        return new Response("service unavailable", { status: 503 });
      }
      return new Response("ok", { status: 200 });
    }) as typeof fetch;
    process.env.CONTACT_RETRY_BASE_DELAY_MS = "10"; // fast retry for the test
    try {
      const { status, body } = await submitContactForm({
        name: "Retry Test",
        email: "retry@example.com",
        subject: "Retry behavior test",
        body: "Exercises the retry loop with a stubbed fetch.",
      });
      if (status === 200 && body === "ok" && callCount === 3) {
        console.log(`PASS (retry): succeeded on attempt ${callCount} after 2 retryable failures`);
      } else {
        console.error(`FAIL (retry): status=${status} body=${body} callCount=${callCount}`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`FAIL (retry): unexpected throw: ${(err as Error).message}`);
      process.exit(1);
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.CONTACT_RETRY_BASE_DELAY_MS;
    }
  }

  console.log("ALL PASS");
  process.exit(0);
}

await run();
