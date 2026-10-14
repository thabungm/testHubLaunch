import {
  submitContactForm,
  buildSlackPayload,
  validateContact,
  ContactValidationError,
  type ContactInput,
} from "./contact.ts";
import { writeFile } from "node:fs/promises";

/**
 * Describes the Node-side live send attempt. It intentionally carries only
 * non-secret status/body text (Slack returns `200` + `ok` on success); the
 * `SLACK_URL` value/token never appears here, in stdout, or in the generated
 * HTML.
 */
type SendOutcome = {
  /** Whether a real POST to Slack was attempted (false under `--dry-run`). */
  attempted: boolean;
  /** True only when the send returned HTTP 200 with body `ok`. */
  ok: boolean;
  /** HTTP status of the Slack response, when a send was attempted. */
  status?: number;
  /** Response body text (e.g. `ok`), when a send was attempted. */
  body?: string;
  /** Secret-free error summary when the send failed. */
  error?: string;
};

// A realistic sample submission. A timestamped subject helps locate the
// message in the Slack channel (mirrors scripts/test-contact.ts:18). The
// timestamp is resolved at run time inside main(), not here.
const SAMPLE: ContactInput = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  subject: "Contact Us demo",
  body:
    "Hello! This is a sample submission from the Contact Us demo. It exercises " +
    "the real validation + Slack Block Kit payload builder in scripts/contact.ts.",
};

// HTML-escape for interpolation into text and attribute positions. Extends the
// esc() idea in scripts/contact.ts:35-38 with the double-quote entity so values
// are safe inside quoted attributes too.
function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Turn an error into a message guaranteed never to contain the SLACK_URL
// value. ContactValidationError exposes a list of issues; submitContactForm
// otherwise throws only the literal "SLACK_URL environment variable is not set"
// (scripts/contact.ts:77) or a generic fetch error ("fetch failed"), none of
// which embed the secret.
function safeMessage(err: unknown): string {
  if (err instanceof ContactValidationError) return err.issues.join("; ");
  return (err as Error).message;
}

// Human-readable, secret-free summary of the send outcome for the page/stdout.
function describeSend(send: SendOutcome): string {
  if (!send.attempted) return "Dry run — not sent";
  if (send.ok) return `Delivered to Slack — HTTP ${send.status}, body: ${send.body}`;
  if (send.error) return `Not sent — ${send.error}`;
  return `Not sent — HTTP ${send.status}, body: ${send.body}`;
}

/**
 * Render a complete, self-contained static HTML "Contact Us" demo page.
 *
 * The page needs no HTTP server and makes no network request: it shows the
 * four-field form pre-filled with `sample`, mirrors `validateContact`'s rules
 * client-side for UX, and previews the Block Kit payload. The authoritative
 * server-side `payload` (from `buildSlackPayload`) and the live `send` outcome
 * are embedded at generation time. The function reads only its three arguments
 * — never `process.env` — so the `SLACK_URL` secret cannot leak into the output.
 */
export function renderContactDemoHtml(args: {
  sample: ContactInput;
  payload: object;
  send: SendOutcome;
}): string {
  const { sample, payload, send } = args;
  const payloadJson = escHtml(JSON.stringify(payload, null, 2));
  const sendLine = escHtml(describeSend(send));
  const sendClass = send.ok ? "ok" : send.attempted ? "err" : "muted";

  // NOTE: the client <script> below is interpolated inside this template
  // literal, so regex/string escapes are doubled (`\\s`, `\\.`, `\\n`) to
  // survive into the generated file, and no `${` appears in the client code.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Contact Us — Demo</title>
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    margin: 0; padding: 2rem; background: #f4f5f7; color: #1d1f23;
    display: flex; justify-content: center;
  }
  main { width: 100%; max-width: 640px; }
  .card {
    background: #fff; border: 1px solid #e2e4e8; border-radius: 12px;
    padding: 1.5rem; margin-bottom: 1.25rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  h1 { font-size: 1.4rem; margin: 0 0 0.25rem; }
  h2 { font-size: 1.05rem; margin: 0 0 0.75rem; }
  .sub { color: #5b6270; margin: 0 0 1.25rem; }
  .banner {
    background: #fff7e6; border: 1px solid #ffe0a3; border-radius: 10px;
    padding: 0.9rem 1rem; color: #6b4e00; font-size: 0.9rem; line-height: 1.45;
  }
  label { display: block; font-weight: 600; margin: 0.75rem 0 0.25rem; font-size: 0.9rem; }
  input, textarea {
    width: 100%; box-sizing: border-box; padding: 0.55rem 0.65rem;
    border: 1px solid #c9ccd3; border-radius: 8px; font: inherit; background: #fff; color: inherit;
  }
  textarea { min-height: 7rem; resize: vertical; }
  button {
    margin-top: 1rem; padding: 0.6rem 1.1rem; font: inherit; font-weight: 600;
    color: #fff; background: #2f6feb; border: none; border-radius: 8px; cursor: pointer;
  }
  button:hover { background: #2559c6; }
  .errors {
    display: none; margin-top: 0.9rem; padding: 0.6rem 0.8rem; font-size: 0.9rem;
    background: #fdecec; border: 1px solid #f5aca6; border-radius: 8px; color: #8a1c13;
  }
  pre {
    background: #0f1320; color: #e6e8ef; padding: 1rem; border-radius: 10px;
    overflow: auto; font-size: 0.82rem; line-height: 1.45; margin: 0.5rem 0 0;
  }
  .result-line { font-weight: 600; }
  .result-line.ok { color: #137333; }
  .result-line.err { color: #a31515; }
  .result-line.muted { color: #5b6270; }
  .hint { color: #5b6270; font-size: 0.82rem; margin: 0.4rem 0 0; }
  code { background: #eef0f3; padding: 0.1rem 0.3rem; border-radius: 4px; }
</style>
</head>
<body>
<main>
  <div class="card">
    <h1>Contact Us — Demo</h1>
    <p class="sub">A self-contained demonstration of the headless Contact&nbsp;Us → Slack feature.</p>
    <div class="banner">
      <strong>How delivery works:</strong> this page demonstrates the form UI only.
      The browser cannot safely deliver to Slack — there is no HTTP server, and
      posting directly from the browser would expose the secret webhook. So real
      delivery is performed <em>server-side</em> by
      <code>submitContactForm()</code> in <code>scripts/contact.ts</code>; its
      result is embedded in the “Server-side result” section below. Submitting
      the form here only previews the payload client-side — it sends nothing.
    </div>
  </div>

  <div class="card">
    <h2>Contact form</h2>
    <form id="contact-form" novalidate>
      <label for="name">Name</label>
      <input id="name" name="name" type="text" value="${escHtml(sample.name)}" />
      <label for="email">Email</label>
      <input id="email" name="email" type="email" value="${escHtml(sample.email)}" />
      <label for="subject">Subject</label>
      <input id="subject" name="subject" type="text" value="${escHtml(sample.subject)}" />
      <label for="body">Body</label>
      <textarea id="body" name="body">${escHtml(sample.body)}</textarea>
      <div id="errors" class="errors"></div>
      <button type="submit">Preview payload</button>
      <p class="hint">
        Client-side validation mirrors <code>validateContact</code>; the preview
        mirrors the authoritative builder in <code>scripts/contact.ts</code> and
        is <strong>not</strong> sent from the browser.
      </p>
    </form>
  </div>

  <div class="card">
    <h2>Client-side payload preview</h2>
    <p class="hint">Updates when you submit the form above. No network request is made.</p>
    <pre id="preview">Submit the form to preview the Block Kit payload.</pre>
  </div>

  <div class="card">
    <h2>Server-side result</h2>
    <p class="result-line ${sendClass}">${sendLine}</p>
    <p class="hint">Authoritative Block Kit payload produced by <code>buildSlackPayload(SAMPLE)</code>:</p>
    <pre>${payloadJson}</pre>
  </div>
</main>

<script>
(function () {
  var EMAIL_RE = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/;
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function buildPreview(v) {
    var name = esc(v.name.trim());
    var email = esc(v.email.trim());
    var subject = esc(v.subject.trim());
    var body = esc(v.body.trim());
    var header = ("📬 New Contact: " + subject).slice(0, 150);
    var message = body.slice(0, 2900);
    return {
      text: "New contact from " + name + " (" + email + "): " + subject,
      blocks: [
        { type: "header", text: { type: "plain_text", text: header } },
        { type: "section", fields: [
          { type: "mrkdwn", text: "*Name:*\\n" + name },
          { type: "mrkdwn", text: "*Email:*\\n" + email }
        ] },
        { type: "section", text: { type: "mrkdwn", text: "*Message:*\\n" + message } }
      ]
    };
  }
  var form = document.getElementById("contact-form");
  var errors = document.getElementById("errors");
  var preview = document.getElementById("preview");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = {
      name: form.elements["name"].value,
      email: form.elements["email"].value,
      subject: form.elements["subject"].value,
      body: form.elements["body"].value
    };
    var issues = [];
    if (!v.name.trim()) issues.push("name is required");
    if (!v.email.trim()) issues.push("email is required");
    else if (!EMAIL_RE.test(v.email.trim())) issues.push("email is invalid");
    if (!v.subject.trim()) issues.push("subject is required");
    if (!v.body.trim()) issues.push("body is required");
    if (issues.length) {
      errors.textContent = "Validation failed: " + issues.join("; ");
      errors.style.display = "block";
      preview.textContent = "";
      return;
    }
    errors.style.display = "none";
    errors.textContent = "";
    preview.textContent = JSON.stringify(buildPreview(v), null, 2);
  });
})();
</script>
</body>
</html>
`;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const outArg = argv.find((a) => a.startsWith("--out="));
  const outPath = outArg ? outArg.slice("--out=".length) : "contact-demo.html";
  const dryRun = argv.includes("--dry-run") || argv.includes("--no-send");

  // A timestamped subject makes the live Slack message easy to locate.
  const sample: ContactInput = {
    ...SAMPLE,
    subject: `${SAMPLE.subject} — ${new Date().toISOString()}`,
  };

  // Guard: the bundled sample must be valid even under --dry-run (no send to
  // validate it otherwise). Fixed and valid by construction; fail fast if edited.
  validateContact(sample);

  // Always build the payload offline — no network, no secret.
  const payload = buildSlackPayload(sample);

  let send: SendOutcome;
  if (dryRun) {
    send = { attempted: false, ok: false };
  } else {
    try {
      const { status, body } = await submitContactForm(sample);
      send = { attempted: true, ok: status === 200 && body === "ok", status, body };
    } catch (err) {
      // Record a secret-free outcome; never crash before writing the page.
      send = { attempted: true, ok: false, error: safeMessage(err) };
    }
  }

  try {
    await writeFile(outPath, renderContactDemoHtml({ sample, payload, send }));
  } catch (err) {
    console.error(`Failed to write ${outPath}: ${(err as Error).message}`);
    process.exit(1);
  }

  if (send.attempted) {
    if (send.ok) {
      console.log(`Contact submitted to Slack (HTTP ${send.status})`);
    } else {
      console.error(`Contact send failed: ${describeSend(send)}`);
    }
  } else {
    console.log("Dry run — no Slack message sent.");
  }
  console.log(`Wrote ${outPath}`);

  process.exit(send.attempted && !send.ok ? 1 : 0);
}

// Run main only when executed directly, not when imported.
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
