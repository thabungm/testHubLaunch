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
    phone: "+14155552671",
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

  // Test 3: validation rejects invalid phone format.
  try {
    validateContact({
      name: "Test User",
      email: "test@example.com",
      subject: "Test",
      body: "Test body",
      phone: "invalid-phone",
    });
    console.error("FAIL (phone validation): expected ContactValidationError, none thrown");
    process.exit(1);
  } catch (err) {
    if (err instanceof ContactValidationError && err.issues.some((i) => i.includes("phone"))) {
      console.log(`PASS (phone validation): rejected invalid phone`);
    } else {
      console.error(`FAIL (phone validation): unexpected error ${(err as Error).message}`);
      process.exit(1);
    }
  }

  // Test 4: validation accepts valid E.164 phone format.
  try {
    validateContact({
      name: "Test User",
      email: "test@example.com",
      subject: "Test",
      body: "Test body",
      phone: "+14155552671",
    });
    console.log("PASS (valid phone): accepted valid E.164 phone");
  } catch (err) {
    console.error(`FAIL (valid phone): ${(err as Error).message}`);
    process.exit(1);
  }

  // Test 5: validation accepts empty phone (optional).
  try {
    validateContact({
      name: "Test User",
      email: "test@example.com",
      subject: "Test",
      body: "Test body",
    });
    console.log("PASS (optional phone): accepted submission without phone");
  } catch (err) {
    console.error(`FAIL (optional phone): ${(err as Error).message}`);
    process.exit(1);
  }

  console.log("ALL PASS");
  process.exit(0);
}

await run();
