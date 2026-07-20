/**
 * Pure HTML builders for the two pages served by the web app.
 *
 * These functions return static HTML strings. They never interpolate
 * user-supplied input — the Contact page's status banner uses fixed strings
 * only, so there is no XSS surface here.
 */

const shell = (title: string, inner: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
  `<meta name="viewport" content="width=device-width, initial-scale=1">` +
  `<title>${title}</title></head><body style="font-family:system-ui;max-width:640px;margin:3rem auto;padding:0 1rem">` +
  `${inner}</body></html>`;

/** Landing page: "Welcome — coming soon" placeholder with a link to Contact. */
export function landingPage(): string {
  return shell(
    "Welcome",
    `<h1>Welcome</h1><p>We are coming soon.</p><p><a href="/contact">Contact us</a></p>`,
  );
}

/**
 * Contact Us page: a native HTML form (email, subject, body) that POSTs to
 * /api/contact. An optional status banner ("ok"/"error") is shown after the
 * post-redirect flow. Banner text is FIXED strings only — never interpolate
 * user input here (XSS).
 */
export function contactPage(status?: "ok" | "error"): string {
  const banner =
    status === "ok"
      ? `<p style="color:green">Thanks! Your message was sent.</p>`
      : status === "error"
        ? `<p style="color:red">Sorry, something went wrong. Please try again.</p>`
        : "";
  return shell(
    "Contact Us",
    `<h1>Contact Us</h1>${banner}
     <form method="POST" action="/api/contact">
       <p><label>Email<br><input type="email" name="email" required></label></p>
       <p><label>Subject<br><input type="text" name="subject" required></label></p>
       <p><label>Body<br><textarea name="body" required rows="6"></textarea></label></p>
       <p><button type="submit">Send</button></p>
     </form>
     <p><a href="/">Back home</a></p>`,
  );
}
