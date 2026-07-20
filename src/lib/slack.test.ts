import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatSlackText, sendSlackNotification } from "./slack";

const INPUT = { email: "a@b.com", subject: "Hi", body: "Hello world" };

describe("formatSlackText", () => {
  it("includes all three fields", () => {
    const text = formatSlackText(INPUT);
    expect(text).toContain("a@b.com");
    expect(text).toContain("Hi");
    expect(text).toContain("Hello world");
  });
});

describe("sendSlackNotification", () => {
  const OLD_ENV = process.env.SLACK_URL;

  beforeEach(() => {
    process.env.SLACK_URL = "https://hooks.slack.com/services/TEST/HOOK/URL";
  });

  afterEach(() => {
    process.env.SLACK_URL = OLD_ENV;
    vi.restoreAllMocks();
  });

  it("POSTs the webhook with the correct payload and resolves on 200 + ok", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("ok", { status: 200 }));

    await expect(sendSlackNotification(INPUT)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, options] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe("https://hooks.slack.com/services/TEST/HOOK/URL");
    expect(options?.method).toBe("POST");
    expect((options?.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    const sent = JSON.parse(options?.body as string);
    expect(sent.text).toContain("a@b.com");
    expect(sent.text).toContain("Hi");
    expect(sent.text).toContain("Hello world");
  });

  it("throws when Slack returns a non-200 status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("no_service", { status: 404 }),
    );
    await expect(sendSlackNotification(INPUT)).rejects.toThrow(/HTTP 404/);
  });

  it("throws when the response body is not 'ok'", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("invalid_payload", { status: 200 }),
    );
    await expect(sendSlackNotification(INPUT)).rejects.toThrow();
  });

  it("throws when SLACK_URL is not set", async () => {
    delete process.env.SLACK_URL;
    await expect(sendSlackNotification(INPUT)).rejects.toThrow(/SLACK_URL/);
  });

  it("never leaks the webhook URL in the error message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("fail", { status: 500 }),
    );
    // `toThrow` only matches substrings/regex/Error — assert the negative by
    // catching the error and inspecting its message directly.
    let caught: Error | undefined;
    try {
      await sendSlackNotification(INPUT);
    } catch (err) {
      caught = err as Error;
    }
    expect(caught).toBeDefined();
    expect(caught?.message).not.toContain("hooks.slack.com");
    expect(caught?.message).not.toContain("TEST/HOOK/URL");
  });
});
