import {
  submitContactForm,
  validateContact,
  ContactValidationError,
  ContactInput,
  buildSlackPayload,
} from "./scripts/contact.ts";

console.log("=== Comprehensive Implementation Verification ===\n");

// AC1 & AC3: Validation works correctly
console.log("AC1/AC3: Testing validation...");
try {
  validateContact({ name: "", email: "invalid", subject: "", body: "" });
  console.log("  ✗ FAIL: Should have thrown");
  process.exit(1);
} catch (err) {
  if (err instanceof ContactValidationError && err.issues.length === 4) {
    console.log(`  ✓ PASS: Validation rejects all 4 fields`);
  } else {
    console.log("  ✗ FAIL: Unexpected error");
    process.exit(1);
  }
}

// AC7: Block Kit payload with escaping
console.log("\nAC7: Testing Block Kit payload and escaping...");
const testInput: ContactInput = {
  name: "Test & User",
  email: "test@example.com",
  subject: "Test <Subject>",
  body: "Test & message with <html>"
};
const payload = buildSlackPayload(testInput);
if (
  payload.blocks &&
  payload.blocks.length === 3 &&
  payload.blocks[0].type === "header" &&
  payload.blocks[1].type === "section" &&
  payload.blocks[2].type === "section" &&
  payload.text &&
  payload.text.includes("Test & User")
) {
  console.log("  ✓ PASS: Block Kit structure correct with 3 blocks");
} else {
  console.log("  ✗ FAIL: Invalid payload structure");
  process.exit(1);
}

// Check escaping
const nameBlock = payload.blocks[1].fields[0].text;
if (nameBlock.includes("&amp;") && nameBlock.includes("&lt;")) {
  console.log("  ✓ PASS: User input escaped (&, < -> &amp;, &lt;)");
} else {
  console.log("  ✗ FAIL: Escaping not applied");
  process.exit(1);
}

// AC8: No runtime dependencies
console.log("\nAC8: Checking dependencies...");
const pkg = await import("./package.json", { assert: { type: "json" } });
if (!pkg.dependencies || Object.keys(pkg.dependencies).length === 0) {
  console.log("  ✓ PASS: No runtime dependencies");
} else {
  console.log(`  ✗ FAIL: Found runtime dependencies: ${Object.keys(pkg.dependencies)}`);
  process.exit(1);
}

// AC4: SLACK_URL check
console.log("\nAC4: Testing SLACK_URL env check...");
const originalUrl = process.env.SLACK_URL;
delete process.env.SLACK_URL;
try {
  await submitContactForm(testInput);
  console.log("  ✗ FAIL: Should have thrown when SLACK_URL is unset");
  process.exit(1);
} catch (err) {
  if ((err as Error).message.includes("SLACK_URL")) {
    console.log("  ✓ PASS: Throws error when SLACK_URL unset");
  } else {
    console.log("  ✗ FAIL: Wrong error");
    process.exit(1);
  }
}
if (originalUrl) process.env.SLACK_URL = originalUrl;

console.log("\n=== All Verification Tests Passed ===");
