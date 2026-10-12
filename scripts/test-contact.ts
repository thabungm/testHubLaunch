import * as os from "node:os";
import * as path from "node:path";
import {
  submitContactForm,
  validateContact,
  ContactValidationError,
  RateLimitError,
  type ContactInput,
} from "./contact.ts";

// Isolate every test run's rate-limit state in a fresh temp file so repeated
// `npm run test:contact` invocations never trip the persisted limit. Unique
// without Date.now()/Math.random(): pid + high-resolution clock.
process.env.CONTACT_RATE_LIMIT_FILE = path.join(
  os.tmpdir(),
  `contact-rate-limit-test-${process.pid}-${process.hrtime.bigint()}.json`,
);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  // From here on, stub the global fetch so rate-limit tests never hit Slack.
  const realFetch = globalThis.fetch;
  let fetchCalls = 0;
  const stub200 = (() => {
    fetchCalls++;
    return Promise.resolve({ status: 200, text: async () => "ok" } as Response);
  }) as typeof fetch;

  // Test 3: limit trips on call N+1 with no POST on the blocked call.
  try {
    globalThis.fetch = stub200;
    fetchCalls = 0;
    process.env.CONTACT_RATE_LIMIT_FILE = path.join(
      os.tmpdir(),
      `contact-rl-test3-${process.pid}-${process.hrtime.bigint()}.json`,
    );
    process.env.CONTACT_RATE_LIMIT_MAX = "5";
    delete process.env.CONTACT_RATE_LIMIT_WINDOW_MS; // default 60000

    const input: ContactInput = {
      name: "RL Tester",
      email: "ratelimit-test@example.com",
      subject: "rate limit",
      body: "testing the per-email rate limit",
    };
    for (let i = 1; i <= 5; i++) {
      const { status } = await submitContactForm(input);
      if (status !== 200) throw new Error(`send ${i} expected 200, got ${status}`);
    }
    let threw = false;
    try {
      await submitContactForm(input);
    } catch (err) {
      if (err instanceof RateLimitError) {
        threw = true;
        if (err.name !== "RateLimitError" || !(err instanceof Error)) {
          throw new Error("RateLimitError name/instanceof wrong");
        }
        if (
          err.email !== "ratelimit-test@example.com" ||
          err.limit !== 5 ||
          err.windowMs !== 60000 ||
          !(typeof err.retryAfterMs === "number") ||
          err.retryAfterMs < 0
        ) {
          throw new Error(`RateLimitError fields wrong: ${JSON.stringify(err)}`);
        }
      } else {
        throw err;
      }
    }
    if (!threw) throw new Error("6th call did not throw RateLimitError");
    if (fetchCalls !== 5) throw new Error(`expected 5 fetch calls, got ${fetchCalls}`);
    console.log("PASS (rate limit): 6th call blocked with RateLimitError, no 6th POST");
  } catch (err) {
    globalThis.fetch = realFetch;
    console.error(`FAIL (rate limit): ${(err as Error).message}`);
    process.exit(1);
  }

  // Test 4: window expiry — a blocked email can send again after the window.
  try {
    fetchCalls = 0;
    process.env.CONTACT_RATE_LIMIT_FILE = path.join(
      os.tmpdir(),
      `contact-rl-test4-${process.pid}-${process.hrtime.bigint()}.json`,
    );
    process.env.CONTACT_RATE_LIMIT_MAX = "1";
    process.env.CONTACT_RATE_LIMIT_WINDOW_MS = "50";

    const input: ContactInput = {
      name: "RL Tester",
      email: "window-test@example.com",
      subject: "window",
      body: "testing window expiry",
    };
    await submitContactForm(input); // consumes the single slot
    let blocked = false;
    try {
      await submitContactForm(input);
    } catch (err) {
      if (err instanceof RateLimitError) blocked = true;
      else throw err;
    }
    if (!blocked) throw new Error("2nd immediate send was not blocked");

    await delay(80); // wait past the 50ms window
    const { status } = await submitContactForm(input);
    if (status !== 200) throw new Error(`post-window send expected 200, got ${status}`);
    console.log("PASS (window expiry): send allowed again after window elapsed");
  } catch (err) {
    globalThis.fetch = realFetch;
    console.error(`FAIL (window expiry): ${(err as Error).message}`);
    process.exit(1);
  }

  // Test 5: non-200 responses do not consume quota.
  try {
    fetchCalls = 0;
    const stub500 = (() => {
      fetchCalls++;
      return Promise.resolve({ status: 500, text: async () => "err" } as Response);
    }) as typeof fetch;
    globalThis.fetch = stub500;
    process.env.CONTACT_RATE_LIMIT_FILE = path.join(
      os.tmpdir(),
      `contact-rl-test5-${process.pid}-${process.hrtime.bigint()}.json`,
    );
    process.env.CONTACT_RATE_LIMIT_MAX = "2";
    delete process.env.CONTACT_RATE_LIMIT_WINDOW_MS;

    const input: ContactInput = {
      name: "RL Tester",
      email: "fail-test@example.com",
      subject: "fail",
      body: "non-200 should not consume quota",
    };
    for (let i = 1; i <= 5; i++) {
      const { status } = await submitContactForm(input);
      if (status !== 500) throw new Error(`send ${i} expected 500, got ${status}`);
    }
    // All 5 returned 500, so none counted; a 200 send must now succeed.
    globalThis.fetch = stub200;
    const { status } = await submitContactForm(input);
    if (status !== 200) throw new Error(`post-failure send expected 200, got ${status}`);
    console.log("PASS (non-200): failed sends did not consume quota");
  } catch (err) {
    globalThis.fetch = realFetch;
    console.error(`FAIL (non-200): ${(err as Error).message}`);
    process.exit(1);
  }

  // Test 6: two emails are tracked independently.
  try {
    globalThis.fetch = stub200;
    process.env.CONTACT_RATE_LIMIT_FILE = path.join(
      os.tmpdir(),
      `contact-rl-test6-${process.pid}-${process.hrtime.bigint()}.json`,
    );
    process.env.CONTACT_RATE_LIMIT_MAX = "1";
    delete process.env.CONTACT_RATE_LIMIT_WINDOW_MS;

    const a: ContactInput = { name: "A", email: "a@example.com", subject: "s", body: "b" };
    const b: ContactInput = { name: "B", email: "b@example.com", subject: "s", body: "b" };
    await submitContactForm(a); // uses up a@'s single slot
    let aBlocked = false;
    try {
      await submitContactForm(a);
    } catch (err) {
      if (err instanceof RateLimitError) aBlocked = true;
      else throw err;
    }
    if (!aBlocked) throw new Error("a@ should be blocked at limit");
    const { status } = await submitContactForm(b); // b@ unaffected
    if (status !== 200) throw new Error(`b@ send expected 200, got ${status}`);
    console.log("PASS (independent emails): one email's limit does not block another");
  } catch (err) {
    globalThis.fetch = realFetch;
    console.error(`FAIL (independent emails): ${(err as Error).message}`);
    process.exit(1);
  }

  globalThis.fetch = realFetch;
  console.log("ALL PASS");
  process.exit(0);
}

await run();
