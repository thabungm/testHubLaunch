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

  // Test 3: valid phone renders a Phone field after Email (no network).
  const withPhone: ContactInput = {
    name: "Test User",
    email: "test@example.com",
    phone: "+15555550123",
    subject: "Phone render test",
    body: "Body text.",
  };
  validateContact(withPhone); // must not throw
  const payload = buildSlackPayload(withPhone) as {
    blocks: { type: string; fields?: { type: string; text: string }[] }[];
  };
  const section = payload.blocks.find((b) => Array.isArray(b.fields));
  const texts = section?.fields?.map((f) => f.text) ?? [];
  const emailIdx = texts.findIndex((t) => t.startsWith("*Email:*"));
  const phoneIdx = texts.findIndex((t) => t.startsWith("*Phone:*"));
  if (phoneIdx !== emailIdx + 1 || !texts[phoneIdx]?.includes("+15555550123")) {
    console.error(`FAIL (phone render): expected a Phone field right after Email, got ${JSON.stringify(texts)}`);
    process.exit(1);
  }
  console.log("PASS (phone render): Phone field rendered after Email");

  // Test 4: invalid phone is rejected with a phone-related issue (no network).
  try {
    validateContact({
      name: "A",
      email: "a@b.co",
      phone: "not-a-number",
      subject: "S",
      body: "B",
    });
    console.error("FAIL (phone validation): expected ContactValidationError, none thrown");
    process.exit(1);
  } catch (err) {
    if (err instanceof ContactValidationError && err.issues.some((i) => i.includes("phone"))) {
      console.log("PASS (phone validation): invalid phone rejected");
    } else {
      console.error(`FAIL (phone validation): unexpected error ${(err as Error).message}`);
      process.exit(1);
    }
  }

  // Test 5: omitted phone still validates (optional field, no network).
  validateContact({ name: "A", email: "a@b.co", subject: "S", body: "B" });
  const noPhone = buildSlackPayload({ name: "A", email: "a@b.co", subject: "S", body: "B" }) as {
    blocks: { type: string; fields?: { type: string; text: string }[] }[];
  };
  const noPhoneSection = noPhone.blocks.find((b) => Array.isArray(b.fields));
  if ((noPhoneSection?.fields ?? []).some((f) => f.text.startsWith("*Phone:*"))) {
    console.error("FAIL (phone omitted): Phone field should not render when phone is absent");
    process.exit(1);
  }
  console.log("PASS (phone omitted): no Phone field when phone absent");

  console.log("ALL PASS");
  process.exit(0);
}

await run();
