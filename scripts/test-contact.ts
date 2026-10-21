import {
  submitContactForm,
  validateContact,
  buildSlackPayload,
  ContactValidationError,
  type ContactInput,
  type ContactPriority,
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

  // Test 3: validation rejects an invalid priority WITHOUT sending to Slack.
  try {
    validateContact({
      name: "Test User",
      email: "test@example.com",
      subject: "Subject",
      body: "Body",
      priority: "urgent" as unknown as ContactPriority,
    });
    console.error("FAIL (priority validation): expected ContactValidationError, none thrown");
    process.exit(1);
  } catch (err) {
    if (err instanceof ContactValidationError && err.issues.includes("priority is invalid")) {
      console.log("PASS (priority validation): rejected invalid priority");
    } else {
      console.error(`FAIL (priority validation): unexpected error ${(err as Error).message}`);
      process.exit(1);
    }
  }

  // Test 4: buildSlackPayload renders a *Priority:* field when priority is supplied (no network).
  {
    const payload = buildSlackPayload({
      name: "Test User",
      email: "test@example.com",
      subject: "Subject",
      body: "Body",
      priority: "high",
    }) as { blocks: Array<{ type: string; fields?: Array<{ type: string; text: string }> }> };
    const section = payload.blocks.find((b) => b.type === "section" && Array.isArray(b.fields));
    const priorityField = section?.fields?.find((f) => f.text.startsWith("*Priority:*"));
    if (priorityField && priorityField.text.includes("🔴 High")) {
      console.log("PASS (priority payload): *Priority:* field present with high emoji/label");
    } else {
      console.error("FAIL (priority payload): expected a *Priority:* field with the high emoji/label");
      process.exit(1);
    }
  }

  console.log("ALL PASS");
  process.exit(0);
}

await run();
