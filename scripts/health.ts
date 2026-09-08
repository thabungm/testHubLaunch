/**
 * Slack health check module
 * Checks if the Slack webhook (SLACK_URL) is configured and reachable.
 * Exports functions for testing and a CLI entry point.
 * The SLACK_URL environment variable is treated as a secret and never logged or rendered.
 */

/** Overall health state: healthy or unhealthy */
export type HealthState = "healthy" | "unhealthy";

/** A single health check result */
export interface HealthCheck {
  name: string;
  state: HealthState;
  detail: string;
  latencyMs?: number;
}

/** The complete health report for Slack */
export interface SlackHealthReport {
  overall: HealthState;
  checks: HealthCheck[];
  checkedAt: string;
  redactedTarget: string | null;
}

/** Options for health checks */
export interface HealthOptions {
  timeoutMs?: number;
  live?: boolean;
}

/**
 * Redact a Slack webhook URL to show only the host and service path,
 * hiding the secret token segments.
 * Example: "https://hooks.slack.com/services/T123/B456/xyz123" → "hooks.slack.com/services/…"
 */
export function redactSlackUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}/services/…`;
  } catch {
    // If URL parsing fails, still return a safe redaction
    return "hooks.slack.com/services/…";
  }
}

/**
 * Check if SLACK_URL is configured and matches the Slack webhook shape.
 * No network call; pure validation of the environment variable.
 */
export function checkSlackConfig(): HealthCheck {
  const url = process.env.SLACK_URL?.trim();

  if (!url) {
    return {
      name: "config",
      state: "unhealthy",
      detail: "SLACK_URL is not set",
    };
  }

  const slackWebhookRegex = /^https:\/\/hooks\.slack\.com\/services\//;
  if (!slackWebhookRegex.test(url)) {
    return {
      name: "config",
      state: "unhealthy",
      detail: "SLACK_URL is not a Slack Incoming Webhook URL",
    };
  }

  return {
    name: "config",
    state: "healthy",
    detail: "SLACK_URL is set and is a Slack webhook URL",
  };
}

/**
 * Check if the Slack webhook endpoint is reachable (non-intrusive probe).
 * Sends an empty POST to the webhook and classifies the response:
 * - HTTP 400 / invalid_payload: endpoint is live
 * - HTTP 404 / no_service: endpoint is dead/revoked
 * - HTTP 200: endpoint accepted empty payload
 * - Any other response or network error: unhealthy
 * Records latency and handles timeouts gracefully.
 */
export async function checkSlackReachability(
  url: string,
  timeoutMs: number
): Promise<HealthCheck> {
  const startTime = performance.now();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
      signal: AbortSignal.timeout(timeoutMs),
    });

    const latencyMs = Math.round(performance.now() - startTime);
    const text = (await res.text()).trim();

    if (res.status === 400 || text === "invalid_payload") {
      return {
        name: "reachability",
        state: "healthy",
        detail: "webhook endpoint is live (rejected empty payload as expected)",
        latencyMs,
      };
    }

    if (res.status === 404 || text === "no_service" || text === "no_team") {
      return {
        name: "reachability",
        state: "unhealthy",
        detail: "webhook not found (revoked or invalid)",
        latencyMs,
      };
    }

    if (res.status === 200) {
      return {
        name: "reachability",
        state: "healthy",
        detail: "webhook reachable (HTTP 200)",
        latencyMs,
      };
    }

    return {
      name: "reachability",
      state: "unhealthy",
      detail: `unexpected response: HTTP ${res.status}`,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorName = (err as any)?.name || "Error";
    const errorMsg = (err as any)?.message || String(err);
    return {
      name: "reachability",
      state: "unhealthy",
      detail: `unreachable: ${errorName}: ${errorMsg}`,
      latencyMs,
    };
  }
}

/**
 * Perform a live send to the Slack webhook.
 * Sends a real message: "✅ Slack health check <ISO timestamp>"
 * Returns healthy only if HTTP 200 and response body is "ok".
 */
export async function checkSlackLiveSend(
  url: string,
  timeoutMs: number
): Promise<HealthCheck> {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();
  const payload = { text: `✅ Slack health check ${timestamp}` };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const latencyMs = Math.round(performance.now() - startTime);
    const text = (await res.text()).trim();

    if (res.status === 200 && text === "ok") {
      return {
        name: "live",
        state: "healthy",
        detail: "live message posted successfully",
        latencyMs,
      };
    }

    return {
      name: "live",
      state: "unhealthy",
      detail: `unexpected response: HTTP ${res.status}`,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorName = (err as any)?.name || "Error";
    const errorMsg = (err as any)?.message || String(err);
    return {
      name: "live",
      state: "unhealthy",
      detail: `unreachable: ${errorName}: ${errorMsg}`,
      latencyMs,
    };
  }
}

/**
 * Orchestrate all health checks.
 * Flow: check config → if unhealthy, skip network checks and return;
 * else run reachability check → optionally run live check.
 * Overall state is healthy only if all performed checks are healthy.
 * Returns a complete report with timestamp and redacted target.
 */
export async function checkSlackHealth(
  opts?: HealthOptions
): Promise<SlackHealthReport> {
  const timeoutMs = opts?.timeoutMs ?? 5000;
  const live = opts?.live ?? false;
  const checks: HealthCheck[] = [];

  // Config check (no network)
  const configCheck = checkSlackConfig();
  checks.push(configCheck);

  let redactedTarget: string | null = null;
  const slackUrl = process.env.SLACK_URL?.trim();

  if (configCheck.state === "healthy" && slackUrl) {
    // Config is good, proceed to network checks
    redactedTarget = redactSlackUrl(slackUrl);

    // Reachability check
    const reachCheck = await checkSlackReachability(slackUrl, timeoutMs);
    checks.push(reachCheck);

    // Live send check (only if requested)
    if (live) {
      const liveCheck = await checkSlackLiveSend(slackUrl, timeoutMs);
      checks.push(liveCheck);
    }
  } else {
    // Config unhealthy; mark network checks as skipped
    if (redactedTarget === null && slackUrl) {
      redactedTarget = redactSlackUrl(slackUrl);
    }
  }

  // Compute overall state
  const overall: HealthState = checks.every((c) => c.state === "healthy")
    ? "healthy"
    : "unhealthy";

  return {
    overall,
    checks,
    checkedAt: new Date().toISOString(),
    redactedTarget,
  };
}

/**
 * Render a health report as formatted text suitable for terminal output.
 * Example:
 *   Slack Health — HEALTHY
 *   Target:  hooks.slack.com/services/…
 *   Checked: 2026-07-17T19:54:00.000Z
 *
 *     [OK]   config        SLACK_URL is set and is a Slack webhook URL
 *     [OK]   reachability  webhook endpoint is live (rejected empty payload)  (123ms)
 */
export function renderHealthText(report: SlackHealthReport): string {
  const lines: string[] = [];

  lines.push(`Slack Health — ${report.overall.toUpperCase()}`);
  if (report.redactedTarget) {
    lines.push(`Target:  ${report.redactedTarget}`);
  }
  lines.push(`Checked: ${report.checkedAt}`);
  lines.push("");

  for (const check of report.checks) {
    const stateTag = check.state === "healthy" ? "[OK]" : "[FAIL]";
    let line = `  ${stateTag}   ${check.name.padEnd(14)}${check.detail}`;
    if (check.latencyMs !== undefined) {
      line += `   (${check.latencyMs}ms)`;
    }
    lines.push(line);
  }

  return lines.join("\n");
}

/**
 * Render a health report as a self-contained HTML page.
 * Includes inline CSS, no external assets.
 * Status badge: green for healthy, red for unhealthy.
 */
export function renderHealthPageHtml(report: SlackHealthReport): string {
  const statusColor = report.overall === "healthy" ? "#2ecc71" : "#e74c3c";
  const statusBg = report.overall === "healthy" ? "#d4edda" : "#f8d7da";
  const borderColor = report.overall === "healthy" ? "#28a745" : "#c82333";

  const checksHtml = report.checks
    .map((check) => {
      const stateIcon = check.state === "healthy" ? "✓" : "✗";
      const stateColor = check.state === "healthy" ? "#2ecc71" : "#e74c3c";
      let latency = "";
      if (check.latencyMs !== undefined) {
        latency = `<td style="text-align: right; color: #666; font-size: 0.9em;">${check.latencyMs}ms</td>`;
      } else {
        latency = `<td style="text-align: right; color: #999; font-size: 0.9em;">—</td>`;
      }
      return `
        <tr>
          <td style="padding: 8px 12px; text-align: center; color: ${stateColor}; font-weight: bold;">${stateIcon}</td>
          <td style="padding: 8px 12px; font-weight: 500; width: 100px;">${check.name}</td>
          <td style="padding: 8px 12px; color: #333;">${check.detail}</td>
          ${latency}
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Slack Health</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      max-width: 600px;
      width: 100%;
      padding: 32px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      border-bottom: 2px solid #eee;
      padding-bottom: 16px;
    }
    .title {
      font-size: 28px;
      font-weight: 700;
      color: #333;
    }
    .badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background-color: ${statusBg};
      color: ${statusColor};
      border: 2px solid ${borderColor};
    }
    .meta {
      margin-bottom: 24px;
      padding: 12px;
      background: #f9f9f9;
      border-radius: 6px;
      font-size: 13px;
      color: #666;
      line-height: 1.6;
    }
    .meta div {
      margin: 4px 0;
    }
    .meta strong {
      display: inline-block;
      width: 80px;
      color: #333;
    }
    .checks-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .checks-table tr {
      border-bottom: 1px solid #eee;
    }
    .checks-table tr:last-child {
      border-bottom: none;
    }
    .checks-table td {
      padding: 12px;
      vertical-align: top;
    }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">Slack Health</div>
      <div class="badge">${report.overall.toUpperCase()}</div>
    </div>

    <div class="meta">
      <div><strong>Target:</strong> ${report.redactedTarget || "Not configured"}</div>
      <div><strong>Checked:</strong> ${report.checkedAt}</div>
    </div>

    <table class="checks-table">
      ${checksHtml}
    </table>

    <div class="footer">
      Health check report — no URL tokens or secrets included
    </div>
  </div>
</body>
</html>`;
}

/**
 * Main CLI entry point.
 * Usage:
 *   npm run health                          # print text report
 *   npm run health -- --html                # print text + write health.html
 *   npm run health -- --html=status.html    # print text + write status.html
 *   npm run health -- --live                # include live send test
 *   npm run health -- --timeout=<ms>        # custom timeout
 *
 * Exit code: 0 if healthy, 1 if unhealthy.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let htmlPath: string | null = null;
  let live = false;
  let timeoutMs = 5000;

  for (const arg of args) {
    if (arg === "--html") {
      htmlPath = "health.html";
    } else if (arg.startsWith("--html=")) {
      htmlPath = arg.slice("--html=".length);
    } else if (arg === "--live") {
      live = true;
    } else if (arg.startsWith("--timeout=")) {
      timeoutMs = parseInt(arg.slice("--timeout=".length), 10) || 5000;
    }
  }

  const report = await checkSlackHealth({ timeoutMs, live });

  // Print text report
  console.log(renderHealthText(report));

  // Write HTML if requested
  if (htmlPath) {
    try {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(htmlPath, renderHealthPageHtml(report), "utf-8");
      console.log(`Wrote ${htmlPath}`);
    } catch (err) {
      const msg = (err as any)?.message || String(err);
      console.error(`Failed to write ${htmlPath}: ${msg}`);
      process.exit(1);
    }
  }

  // Exit with appropriate code
  process.exit(report.overall === "healthy" ? 0 : 1);
}

// Guard for direct run
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
