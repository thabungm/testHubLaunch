import {
  submitContactForm,
  validateContact,
  buildSlackPayload,
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

  // Test 3: valid E.164 phone passes validation (no throw).
  try {
    validateContact({ name: "A", email: "a@b.co", subject: "s", body: "b", phone: "+14155550100" });
    console.log("PASS (valid phone): accepted E.164 phone");
  } catch (err) {
    console.error(`FAIL (valid phone): unexpected error ${(err as Error).message}`);
    process.exit(1);
  }

  // Test 4: invalid phone is rejected with a "phone is invalid" issue.
  try {
    validateContact({ name: "A", email: "a@b.co", subject: "s", body: "b", phone: "12345" });
    console.error("FAIL (invalid phone): expected ContactValidationError, none thrown");
    process.exit(1);
  } catch (err) {
    if (err instanceof ContactValidationError && err.issues.includes("phone is invalid")) {
      console.log("PASS (invalid phone): rejected with 'phone is invalid'");
    } else {
      console.error(`FAIL (invalid phone): unexpected error ${(err as Error).message}`);
      process.exit(1);
    }
  }

  // Test 5: payload includes a Phone field after Email when phone is present.
  {
    const payload = buildSlackPayload({
      name: "A",
      email: "a@b.co",
      subject: "s",
      body: "b",
      phone: "+14155550100",
    }) as { blocks: { fields?: { text: string }[] }[] };
    const fields = payload.blocks[1]?.fields ?? [];
    const emailIdx = fields.findIndex((f) => f.text.startsWith("*Email:*"));
    const phoneIdx = fields.findIndex((f) => f.text.startsWith("*Phone:*"));
    if (phoneIdx !== -1 && emailIdx !== -1 && phoneIdx > emailIdx) {
      console.log("PASS (payload phone present): Phone field rendered after Email");
    } else {
      console.error(
        `FAIL (payload phone present): emailIdx=${emailIdx}, phoneIdx=${phoneIdx}`,
      );
      process.exit(1);
    }
  }

  // Test 6: payload omits the Phone field when phone is absent.
  {
    const payload = buildSlackPayload({
      name: "A",
      email: "a@b.co",
      subject: "s",
      body: "b",
    }) as { blocks: { fields?: { text: string }[] }[] };
    const fields = payload.blocks[1]?.fields ?? [];
    if (!fields.some((f) => f.text.startsWith("*Phone:*"))) {
      console.log("PASS (payload phone absent): no Phone field rendered");
    } else {
      console.error("FAIL (payload phone absent): unexpected Phone field");
      process.exit(1);
    }
  }

  console.log("ALL PASS");
  process.exit(0);
}

await run();
