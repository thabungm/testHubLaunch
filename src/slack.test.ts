import { test } from "node:test";
import assert from "node:assert/strict";
import { sendContactToSlack } from "./slack.ts";

test("sendContactToSlack posts a real message to the live SLACK_URL and Slack returns 200 ok", async () => {
  // This is a LIVE test: it requires SLACK_URL to be set and will post to the real channel.
  assert.ok(
    process.env.SLACK_URL?.trim(),
    "SLACK_URL must be set to run the live Slack notification test",
  );

  const result = await sendContactToSlack({
    email: "test@example.com",
    subject: "Automated test — contact form",
    body: "This message was sent by the automated Slack notification test.",
  });

  // Slack Incoming Webhooks return HTTP 200 with the literal body "ok" on success.
  assert.equal(
    result.status,
    200,
    `expected HTTP 200, got ${result.status} (body: ${result.body})`,
  );
  assert.equal(
    result.body,
    "ok",
    `expected Slack body "ok", got "${result.body}"`,
  );
});

test("sendContactToSlack throws when SLACK_URL is unset", async () => {
  const prev = process.env.SLACK_URL;
  delete process.env.SLACK_URL;
  try {
    await assert.rejects(
      () => sendContactToSlack({ email: "a@b.com", subject: "s", body: "b" }),
      /SLACK_URL environment variable is not set/,
    );
  } finally {
    if (prev !== undefined) process.env.SLACK_URL = prev;
  }
});
