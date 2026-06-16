#!/usr/bin/env tsx
/**
 * Deployment Startup Script
 * Automatically logs in to preview deployment before opening
 *
 * Context passed as first argument (JSON string):
 * {
 *   deploymentUrl: string;
 *   issueNumber?: number;
 *   prNumber?: number;
 *   prTitle?: string;
 *   prUrl?: string;
 * }
 */

import { chromium } from "@playwright/test";

interface HookContext {
  deploymentUrl: string;
  issueNumber?: number;
  prNumber?: number;
}

async function main() {
  const contextJson = process.argv[2];
  if (!contextJson) {
    console.error("Error: No context provided");
    process.exit(1);
  }

  const context: HookContext = JSON.parse(contextJson);
  console.log(`🚀 Starting preview for: ${context.deploymentUrl}`);

  // Browser headless mode: Use env var or default to visible
  const headless = process.env.CI === "true" || process.env.HEADLESS === "true";

  const browser = await chromium.launch({
    headless,
    slowMo: headless ? 0 : 100,
  });

  const page = await browser.newPage();

  try {
    await page.goto(context.deploymentUrl);

    // Wait for Clerk authentication widget
    await page.waitForSelector('[data-clerk-id]', { timeout: 5000 });

    // Click sign-in button
    await page.click('button:has-text("Sign in")');

    // Fill in credentials from environment
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    if (!email || !password) {
      throw new Error(
        "Required: TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables"
      );
    }

    // Enter email
    await page.fill('input[name="identifier"]', email);
    await page.click('button:has-text("Continue")');

    // Enter password
    await page.fill('input[name="password"]', password);
    await page.click('button:has-text("Continue")');

    // Wait for successful login
    await page.waitForURL(`${context.deploymentUrl}/**`, {
      timeout: 10000
    });

    console.log("✅ Successfully logged in with Clerk!");
    console.log("Browser will remain open for testing.");

    // Keep browser open - user closes when done
    // Don't call browser.close()

  } catch (error) {
    console.error("❌ Login failed:", error);
    await browser.close();
    process.exit(1);
  }
}

main().catch(console.error);
