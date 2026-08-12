/**
 * Live end-to-end test for the Slack Health feature.
 *
 *   Test 1 — config validation (no network): checks that checkSlackConfig() correctly
 *            validates SLACK_URL (unset, invalid, valid).
 *   Test 2 — live reachability (network): performs a REAL health check via checkSlackHealth()
 *            against the live webhook and asserts the config and reachability checks pass.
 *
 * Requires SLACK_URL to be set for Test 2. Run with:  tsx scripts/test-health.ts
 */
import { checkSlackConfig, checkSlackHealth } from "./health.ts";

async function run(): Promise<void> {
  if (!process.env.SLACK_URL?.trim()) {
    console.error("FAIL: SLACK_URL not set — cannot run live test");
    process.exit(1);
  }

  // Test 1: config validation (no network).
  // First, test with SLACK_URL unset.
  const originalUrl = process.env.SLACK_URL;
  delete process.env.SLACK_URL;
  const unsetCheck = checkSlackConfig();
  if (unsetCheck.state !== "unhealthy" || !unsetCheck.detail.includes("not set")) {
    console.error(
      `FAIL (config unset): expected unhealthy with 'not set' message, got: ${unsetCheck.detail}`,
    );
    process.exit(1);
  }
  console.log("PASS (config unset): correctly reports SLACK_URL not set");

  // Test with invalid URL (not a Slack webhook).
  process.env.SLACK_URL = "not-a-url";
  const invalidCheck = checkSlackConfig();
  if (
    invalidCheck.state !== "unhealthy" ||
    !invalidCheck.detail.includes("Slack Incoming Webhook")
  ) {
    console.error(
      `FAIL (config invalid): expected unhealthy with Slack Webhook message, got: ${invalidCheck.detail}`,
    );
    process.exit(1);
  }
  console.log("PASS (config invalid): correctly rejects non-Slack URL");

  // Restore the real SLACK_URL for the rest of the tests.
  process.env.SLACK_URL = originalUrl;

  // Test with the real SLACK_URL.
  const validCheck = checkSlackConfig();
  if (validCheck.state !== "healthy") {
    console.error(
      `FAIL (config valid): expected healthy with real SLACK_URL, got: ${validCheck.detail}`,
    );
    process.exit(1);
  }
  console.log("PASS (config valid): correctly recognizes real SLACK_URL");

  // Test 2: live reachability check (network).
  // Call checkSlackHealth() without the --live flag (non-intrusive).
  try {
    const report = await checkSlackHealth();
    if (report.overall !== "healthy") {
      console.error(`FAIL (live health): expected healthy overall, got unhealthy`);
      console.error(`  Checks: ${JSON.stringify(report.checks, null, 2)}`);
      process.exit(1);
    }

    // Verify that config and reachability checks both pass.
    const configCheckResult = report.checks.find((c) => c.name === "config");
    const reachabilityCheckResult = report.checks.find((c) => c.name === "reachability");

    if (!configCheckResult || configCheckResult.state !== "healthy") {
      console.error("FAIL (live health): config check did not pass");
      process.exit(1);
    }

    if (!reachabilityCheckResult || reachabilityCheckResult.state !== "healthy") {
      console.error("FAIL (live health): reachability check did not pass");
      process.exit(1);
    }

    // Verify no live send was performed (--live not passed, so no "live" check should exist).
    const liveCheckResult = report.checks.find((c) => c.name === "live");
    if (liveCheckResult) {
      console.error(
        "FAIL (live health): unexpected live check present (should not be run without --live flag)",
      );
      process.exit(1);
    }

    console.log("PASS (live health): non-intrusive health check passed, no message posted");
  } catch (err) {
    console.error(`FAIL (live health): ${(err as Error).message}`);
    process.exit(1);
  }

  console.log("ALL PASS");
  process.exit(0);
}

await run();
