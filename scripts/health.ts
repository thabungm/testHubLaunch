/**
 * Slack Health Check — validates webhook configuration and reachability.
 *
 * Exposes a headless, reusable API:
 *   - checkSlackConfig()         — validates SLACK_URL env var (no network)
 *   - checkSlackReachability()   — probes webhook without posting a message (network, non-intrusive)
 *   - checkSlackLiveSend()       — real message send (network, channel-visible)
 *   - checkSlackHealth()         — orchestrates all checks
 *   - redactSlackUrl()           — redacts token from URL for display
 *   - renderHealthText()         — terminal-friendly report
 *   - renderHealthPageHtml()     — self-contained HTML page
 *
 * The SLACK_URL is a secret and is never logged or embedded in output.
 */

/**
 * Overall health state: all checks passing = "healthy", any check failing = "unhealthy".
 */
export type HealthState = "healthy" | "unhealthy";

/**
 * A single health check result with name, state, detail, and optional latency.
 */
export interface HealthCheck {
  name: string;
  state: HealthState;
  detail: string;
  latencyMs?: number;
}

/**
 * The full health report from checkSlackHealth(), including overall state,
 * all individual checks, timestamp, and redacted target URL.
 */
export interface SlackHealthReport {
  overall: HealthState;
  checks: HealthCheck[];
  checkedAt: string;
  redactedTarget: string | null;
}

/**
 * Options for checkSlackHealth().
 *   timeoutMs: timeout in milliseconds for network calls (default 5000)
 *   live: if true, also perform a real message send (default false)
 */
export interface HealthOptions {
  timeoutMs?: number;
  live?: boolean;
}

/**
 * Clean the raw SLACK_URL from process.env: trim and remove quotes/commas if present.
 * Mirrors the quote-stripping logic from contact.ts.
 */
function cleanSlackUrl(raw: string): string {
  let cleaned = raw.trim();
  // Strip surrounding quotes and commas (e.g., from .env files or config arrays)
  if (cleaned && (cleaned.startsWith('"') || cleaned.startsWith("'"))) {
    cleaned = cleaned.replace(/^["']|["',]+$/g, "").trim();
  }
  return cleaned;
}

/**
 * Redact the SLACK_URL for display: extract host and /services/… path,
 * hide token segments.
 * E.g., "https://hooks.slack.com/services/T001/B001/XXX" → "hooks.slack.com/services/…"
 */
export function redactSlackUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.host;
    const path = u.pathname.split("/");
    // /services/T.../B.../XXX → /services/…
    if (path[1] === "services") {
      return `${host}/services/…`;
    }
    return `${host}/services/…`;
  } catch {
    // If URL parsing fails, just redact everything after the host
    return "hooks.slack.com/services/…";
  }
}

/**
 * Check if SLACK_URL is configured and is a valid Slack Incoming Webhook URL.
 * No network call; pure validation of process.env.SLACK_URL.
 */
export function checkSlackConfig(): HealthCheck {
  let url = process.env.SLACK_URL;
  if (!url) {
    return {
      name: "config",
      state: "unhealthy",
      detail: "SLACK_URL is not set",
    };
  }

  url = cleanSlackUrl(url);

  if (!url) {
    return {
      name: "config",
      state: "unhealthy",
      detail: "SLACK_URL is not set",
    };
  }

  // Check if it matches the Slack Incoming Webhook pattern
  if (!url.match(/^https:\/\/hooks\.slack\.com\/services\//)) {
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
 * Probe the Slack webhook endpoint with an empty body (non-intrusive).
 * A live endpoint returns HTTP 400 with body "invalid_payload" (or HTTP 200).
 * A dead endpoint returns HTTP 404 with "no_service" or "no_team".
 * Measures and returns latencyMs.
 */
export async function checkSlackReachability(
  url: string,
  timeoutMs: number,
): Promise<HealthCheck> {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
      signal: AbortSignal.timeout(timeoutMs),
    });

    const elapsed = performance.now() - start;
    const text = (await res.text()).trim();

    // Classification based on Slack's observable webhook responses.
    if (res.status === 400 || text === "invalid_payload") {
      return {
        name: "reachability",
        state: "healthy",
        detail: "webhook endpoint is live (rejected empty payload as expected)",
        latencyMs: Math.round(elapsed),
      };
    }

    if (res.status === 404 || text === "no_service" || text === "no_team") {
      return {
        name: "reachability",
        state: "unhealthy",
        detail: "webhook not found (revoked or invalid)",
        latencyMs: Math.round(elapsed),
      };
    }

    if (res.status === 200) {
      return {
        name: "reachability",
        state: "healthy",
        detail: "webhook reachable (HTTP 200)",
        latencyMs: Math.round(elapsed),
      };
    }

    // Unexpected status
    return {
      name: "reachability",
      state: "unhealthy",
      detail: `unexpected response: HTTP ${res.status}`,
      latencyMs: Math.round(elapsed),
    };
  } catch (err) {
    const elapsed = performance.now() - start;
    const errorName = (err as Error).name || "Error";
    const errorMsg = (err as Error).message || String(err);

    return {
      name: "reachability",
      state: "unhealthy",
      detail: `unreachable: ${errorName}: ${errorMsg}`,
      latencyMs: Math.round(elapsed),
    };
  }
}

/**
 * Real Slack message send (channel-visible). Posts a test message and asserts HTTP 200 + body "ok".
 * Only called when the user explicitly requests it via --live flag.
 */
export async function checkSlackLiveSend(
  url: string,
  timeoutMs: number,
): Promise<HealthCheck> {
  const start = performance.now();
  try {
    const timestamp = new Date().toISOString();
    const payload = {
      text: `✅ Slack health check ${timestamp}`,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const elapsed = performance.now() - start;
    const text = (await res.text()).trim();

    if (res.status === 200 && text === "ok") {
      return {
        name: "live",
        state: "healthy",
        detail: "live message sent successfully",
        latencyMs: Math.round(elapsed),
      };
    }

    return {
      name: "live",
      state: "unhealthy",
      detail: `unexpected response: HTTP ${res.status}`,
      latencyMs: Math.round(elapsed),
    };
  } catch (err) {
    const elapsed = performance.now() - start;
    const errorName = (err as Error).name || "Error";
    const errorMsg = (err as Error).message || String(err);

    return {
      name: "live",
      state: "unhealthy",
      detail: `unreachable: ${errorName}: ${errorMsg}`,
      latencyMs: Math.round(elapsed),
    };
  }
}

/**
 * Orchestrate all health checks: config (no network), then reachability (if config OK),
 * then optionally live send. Returns a complete report.
 * Overall is "healthy" only if all performed checks are healthy.
 */
export async function checkSlackHealth(
  opts?: HealthOptions,
): Promise<SlackHealthReport> {
  const timeoutMs = opts?.timeoutMs ?? 5000;
  const live = opts?.live ?? false;
  const checks: HealthCheck[] = [];

  // Always start with config check
  const configCheck = checkSlackConfig();
  checks.push(configCheck);

  // If config is unhealthy, skip network checks
  let redactedTarget: string | null = null;
  if (configCheck.state === "unhealthy") {
    // Mark network checks as skipped due to config failure
    checks.push({
      name: "reachability",
      state: "unhealthy",
      detail: "skipped: SLACK_URL invalid",
    });
    if (live) {
      checks.push({
        name: "live",
        state: "unhealthy",
        detail: "skipped: SLACK_URL invalid",
      });
    }
  } else {
    // Config is healthy; get the URL and perform network checks
    const url = cleanSlackUrl(process.env.SLACK_URL!);
    redactedTarget = redactSlackUrl(url);

    // Reachability check (always non-intrusive)
    const reachabilityCheck = await checkSlackReachability(url, timeoutMs);
    checks.push(reachabilityCheck);

    // Live send check (only if requested)
    if (live) {
      const liveSendCheck = await checkSlackLiveSend(url, timeoutMs);
      checks.push(liveSendCheck);
    }
  }

  // Compute overall health: healthy only if all checks are healthy
  const overall: HealthState = checks.every((c) => c.state === "healthy")
    ? "healthy"
    : "unhealthy";

  const checkedAt = new Date().toISOString();

  return {
    overall,
    checks,
    checkedAt,
    redactedTarget,
  };
}

/**
 * Render the health report as a terminal-friendly text report.
 * Format:
 *   Slack Health — <OVERALL>
 *   Target:  <redacted-host>
 *   Checked: <iso-timestamp>
 *
 *     [OK]   config        <detail>     (123ms)
 *     [FAIL] reachability  <detail>
 */
export function renderHealthText(report: SlackHealthReport): string {
  const overallLabel = report.overall.toUpperCase();
  const lines: string[] = [
    `Slack Health — ${overallLabel}`,
    `Target:  ${report.redactedTarget || "N/A"}`,
    `Checked: ${report.checkedAt}`,
    "",
  ];

  for (const check of report.checks) {
    const stateLabel = check.state === "healthy" ? "OK" : "FAIL";
    const latency = check.latencyMs ? `   (${check.latencyMs}ms)` : "";
    lines.push(
      `  [${stateLabel}]  ${check.name.padEnd(14)} ${check.detail}${latency}`,
    );
  }

  return lines.join("\n");
}

/**
 * Render the health report as a self-contained HTML document.
 * Includes inline CSS (no external assets), a colored status badge,
 * and a table of checks.
 */
export function renderHealthPageHtml(report: SlackHealthReport): string {
  const overallLabel = report.overall.toUpperCase();
  const statusColor = report.overall === "healthy" ? "#10b981" : "#ef4444"; // green or red
  const statusBg = report.overall === "healthy" ? "#ecfdf5" : "#fef2f2"; // light green or light red

  const checksHtml = report.checks
    .map((check) => {
      const stateIcon = check.state === "healthy" ? "✓" : "✗";
      const stateStyle =
        check.state === "healthy"
          ? "color: #10b981; font-weight: bold;"
          : "color: #ef4444; font-weight: bold;";
      const latency = check.latencyMs ? ` <span style="color: #999;">(${check.latencyMs}ms)</span>` : "";
      return `
        <tr>
          <td style="border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: center;">
            <span style="${stateStyle}">${stateIcon}</span>
          </td>
          <td style="border-bottom: 1px solid #e5e7eb; padding: 8px; font-weight: 500;">${check.name}</td>
          <td style="border-bottom: 1px solid #e5e7eb; padding: 8px;">${check.detail}${latency}</td>
        </tr>
      `;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Slack Health</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f9fafb;
      padding: 2rem;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 2rem;
    }
    h1 {
      font-size: 1.875rem;
      margin-bottom: 1rem;
      color: #111;
    }
    .header-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .badge {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.875rem;
      background: ${statusBg};
      color: ${statusColor};
      min-width: 80px;
      text-align: center;
    }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 2rem;
      font-size: 0.875rem;
    }
    .meta-item {
      border: 1px solid #e5e7eb;
      padding: 0.75rem;
      border-radius: 4px;
      background: #f9fafb;
    }
    .meta-label {
      color: #666;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .meta-value {
      color: #111;
      word-break: break-all;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead {
      background: #f3f4f6;
    }
    th {
      padding: 0.75rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.875rem;
      color: #374151;
    }
    td {
      padding: 0.75rem;
    }
    .check-name {
      font-weight: 500;
    }
    .check-detail {
      color: #666;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Slack Health</h1>
    <div class="header-row">
      <div class="badge">${overallLabel}</div>
    </div>
    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">Target</div>
        <div class="meta-value">${report.redactedTarget || "N/A"}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Checked</div>
        <div class="meta-value">${report.checkedAt}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 40px;"></th>
          <th>Check</th>
          <th>Detail</th>
        </tr>
      </thead>
      <tbody>
        ${checksHtml}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Direct-run CLI: parse flags and perform health checks.
 *   --html[=<path>]   Write HTML report to <path> (default: health.html)
 *   --live            Also perform a real message send (channel-visible)
 *   --timeout=<ms>    Timeout for network calls in milliseconds (default: 5000)
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
      const val = arg.slice("--timeout=".length);
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed > 0) {
        timeoutMs = parsed;
      }
    }
  }

  try {
    const report = await checkSlackHealth({ timeoutMs, live });

    // Print text report to stdout
    console.log(renderHealthText(report));

    // Write HTML if requested
    if (htmlPath) {
      const fs = await import("node:fs/promises");
      const html = renderHealthPageHtml(report);
      await fs.writeFile(htmlPath, html, "utf-8");
      console.log(`\nWrote ${htmlPath}`);
    }

    // Exit based on health state
    process.exit(report.overall === "healthy" ? 0 : 1);
  } catch (err) {
    console.error(`Health check error: ${(err as Error).message}`);
    process.exit(1);
  }
}

// Run main only when executed directly, not when imported by the test.
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
