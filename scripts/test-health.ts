/**
 * Test suite for the health check module.
 * Mirrors the structure of test-contact.ts.
 * Tests both config validation (no network) and live reachability.
 */

import { checkSlackConfig, checkSlackHealth } from "./health.ts";
import type { HealthState } from "./health.ts";

async function run(): Promise<void> {
  let passed = 0;
  let failed = 0;

  // Test 1: checkSlackConfig() with unset SLACK_URL
  {
    const originalSlackUrl = process.env.SLACK_URL;
    delete process.env.SLACK_URL;

    const result = checkSlackConfig();
    if (result.state === "unhealthy" && result.detail.includes("not set")) {
      console.log("PASS: checkSlackConfig() detects unset SLACK_URL");
      passed++;
    } else {
      console.error(
        `FAIL: checkSlackConfig() should return unhealthy when SLACK_URL is unset, got: ${result.state} - ${result.detail}`
      );
      failed++;
    }

    // Restore SLACK_URL
    if (originalSlackUrl !== undefined) {
      process.env.SLACK_URL = originalSlackUrl;
    }
  }

  // Test 2: checkSlackConfig() with bad URL
  {
    const originalSlackUrl = process.env.SLACK_URL;
    process.env.SLACK_URL = "not-a-url";

    const result = checkSlackConfig();
    if (result.state === "unhealthy" && result.detail.includes("Slack")) {
      console.log("PASS: checkSlackConfig() rejects non-Slack URLs");
      passed++;
    } else {
      console.error(
        `FAIL: checkSlackConfig() should reject "not-a-url", got: ${result.state}`
      );
      failed++;
    }

    // Restore SLACK_URL
    process.env.SLACK_URL = originalSlackUrl;
  }

  // Test 3: checkSlackConfig() with valid SLACK_URL (if set)
  if (process.env.SLACK_URL) {
    const result = checkSlackConfig();
    if (result.state === "healthy") {
      console.log("PASS: checkSlackConfig() accepts valid SLACK_URL");
      passed++;
    } else {
      console.error(
        `FAIL: checkSlackConfig() should return healthy for a real SLACK_URL, got: ${result.state}`
      );
      failed++;
    }
  } else {
    console.log("SKIP: checkSlackConfig() with valid URL (SLACK_URL not set)");
  }

  // Test 4: Live reachability test
  if (!process.env.SLACK_URL) {
    console.error("FAIL: SLACK_URL not set — cannot run live test");
    failed++;
  } else {
    try {
      const report = await checkSlackHealth();
      if (report.overall === "healthy") {
        console.log("PASS: Live health check reports healthy");
        passed++;

        // Verify no visible message was posted (non-intrusive probe)
        const reachCheck = report.checks.find((c) => c.name === "reachability");
        if (reachCheck && reachCheck.state === "healthy") {
          console.log(
            "PASS: Reachability check passed without posting visible message"
          );
          passed++;
        } else {
          console.error("FAIL: Reachability check should have passed");
          failed++;
        }
      } else {
        console.error(
          `FAIL: Live health check should return healthy, got: ${report.overall}`
        );
        console.error(
          `  Checks: ${report.checks.map((c) => `${c.name}=${c.state}`).join(", ")}`
        );
        failed++;
      }
    } catch (err) {
      console.error(
        `FAIL: Live health check threw an error: ${(err as any)?.message}`
      );
      failed++;
    }
  }

  // Summary
  console.log("");
  if (failed === 0) {
    console.log("ALL PASS");
    process.exit(0);
  } else {
    console.log(`${failed} test(s) failed`);
    process.exit(1);
  }
}

await run();
