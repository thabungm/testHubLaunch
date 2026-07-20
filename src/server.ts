/**
 * Minimal HTTP server exposing the Landing and Contact Us pages.
 *
 * Routes:
 *   GET  /             -> Landing page
 *   GET  /contact      -> Contact Us form (+ optional ?status=ok|error banner)
 *   POST /api/contact  -> parse the form, send to Slack, redirect with a status
 *
 * Zero runtime dependencies: Node's built-in `http` + global `fetch`.
 * Run with `tsx` (Node < 22 has no native .ts support): `tsx src/server.ts`.
 */
import http from "node:http";
import { landingPage, contactPage } from "./pages.ts";
import { sendContactToSlack } from "./slack.ts";

const PORT = Number(process.env.PORT ?? 3000);

function html(res: http.ServerResponse, status: number, body: string): void {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

function redirect(res: http.ServerResponse, location: string): void {
  res.writeHead(302, { Location: location });
  res.end();
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/") {
    return html(res, 200, landingPage());
  }
  if (req.method === "GET" && url.pathname === "/contact") {
    const status = url.searchParams.get("status");
    return html(
      res,
      200,
      contactPage(
        status === "ok" ? "ok" : status === "error" ? "error" : undefined,
      ),
    );
  }
  if (req.method === "POST" && url.pathname === "/api/contact") {
    try {
      const params = new URLSearchParams(await readBody(req));
      const email = (params.get("email") ?? "").trim();
      const subject = (params.get("subject") ?? "").trim();
      const body = (params.get("body") ?? "").trim();
      if (!email.includes("@") || !subject || !body) {
        return redirect(res, "/contact?status=error");
      }
      const { status, body: slackBody } = await sendContactToSlack({
        email,
        subject,
        body,
      });
      if (status === 200 && slackBody === "ok") {
        return redirect(res, "/contact?status=ok");
      }
      // Log status/body only — never the webhook URL.
      console.error(`Slack send failed: HTTP ${status}, body: ${slackBody}`);
      return redirect(res, "/contact?status=error");
    } catch (err) {
      // Do NOT log the webhook URL; err.message is safe (no URL in it).
      console.error(`Contact submit error: ${(err as Error).message}`);
      return redirect(res, "/contact?status=error");
    }
  }
  html(res, 404, "<h1>404 Not Found</h1>");
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
