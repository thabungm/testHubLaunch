# Add Simple Contact Page (Static HTML Form)

## Problem Statement

The `thabungm/testHubLaunch` repository has no contact page. A simple contact page is needed to provide users with a way to reach the project team. The implementation must be as simple as possible — a static HTML form with no backend, no third-party services, and no build tooling required.

### Planning Context

> **Note**: This section captures key requirements to provide complete context for implementation.

**Key Requirements Discussed:**

- The page must display a contact form with fields: Name, Email, Message, and a Submit button
- The form does **not** submit data anywhere — it is a UI-only implementation (no backend, no email service, no third-party form handler)
- The implementation must use plain HTML5 + CSS3 with no JavaScript framework, no npm, and no build step
- The page must be compatible with GitHub Pages static hosting

**Decisions Made:**

- Plain static HTML chosen because the project has no existing package.json, no framework, and the requirement is explicitly for the simplest possible implementation
- Form submission is intentionally disabled: the `<form>` element will use `action="#"` and a minimal inline `<script>` block that calls `event.preventDefault()` and shows a static on-page confirmation message — no data is sent anywhere
- Inline script is used (single small block only) because the alternative — a separate `.js` file — adds an extra HTTP request for no benefit on a static page this simple
- A separate `contact.css` file is used for styles to keep HTML readable and allow future styling changes without touching markup

**Out of Scope:**

- Actual form submission (email, database, API, or third-party service)
- Navigation header/footer shared with other pages
- Backend validation or server-side processing
- CAPTCHA or spam protection
- Animated transitions or complex UI interactions

#### Background & Context

- **Why needed**: The project has no contact page; visitors have no structured way to reach the project team
- **Current state**: No `contact.html` exists in the repository root
- **Deployment**: GitHub Pages serves files directly from the repository root — no build step is required
- **Who is affected**: Anyone visiting the site who wants to reach the project team

**Current Behavior**: Navigating to `contact.html` returns a 404 from GitHub Pages.

**Desired Behavior**: Navigating to `contact.html` shows a styled contact form. Filling out the form and clicking Submit shows an on-page confirmation message without navigating away or sending any data.

---

## Detailed Requirements

### Functional Requirements

1. **Contact Form Fields**
   - `Name` — single-line text input, `type="text"`, `name="name"`, required attribute
   - `Email` — email input, `type="email"`, `name="email"`, required attribute (browser validates format)
   - `Message` — multi-line textarea, `name="message"`, `rows="5"`, required attribute
   - `Submit` button — `type="submit"`, label text "Send Message"

2. **Form Submission Behavior**
   - On submit, the page must **not** navigate away or POST data anywhere
   - A success confirmation message (e.g., `"Thank you! Your message has been received."`) must appear in the page below the form
   - The form fields should be cleared after successful "submission"
   - The confirmation message element is hidden by default (`display: none`) and shown via JavaScript after intercept
   - Implementation: inline `<script>` at the bottom of `<body>` attaches a `submit` event listener, calls `event.preventDefault()`, shows the confirmation element, and resets the form

3. **Page Title & Heading**
   - Browser `<title>` must be `Contact — Hula`
   - Visible `<h1>` heading: `Contact Us`

4. **Responsive Layout**
   - `<meta name="viewport" content="width=device-width, initial-scale=1">` must be present
   - Form must be usable on both desktop and mobile screen widths
   - Form max-width: `480px`, centered horizontally

### Technical Requirements

- **Technology**: Plain HTML5 + CSS3 + minimal vanilla JavaScript (one inline `<script>` block, no external JS file)
- **Files to create**:
  - `contact.html` — the contact page (repository root)
  - `contact.css` — page-specific styles (repository root)
- **No dependencies**: No npm packages, no CDN links, no external fonts
- **GitHub Pages compatibility**: Both files placed in repository root are served directly

### Non-Functional Requirements

- **Performance**: Page must load with a maximum of two HTTP requests (`contact.html` + `contact.css`)
- **Accessibility**: Semantic HTML (`<form>`, `<label>`, `<input>`, `<textarea>`); every input must have an associated `<label>` with matching `for`/`id` attributes; `lang="en"` on `<html>`
- **Security**: No data is sent anywhere, so there is no data exposure risk. No external scripts loaded.
- **Backwards Compatibility**: No existing pages are modified by this implementation

---

## Proposed Solution

Create two files in the repository root: `contact.html` and `contact.css`.

The HTML file contains a standard HTML5 page with a `<form>` element. A small inline `<script>` at the bottom of `<body>` intercepts the form's submit event, prevents the default action (which would navigate the page), shows a hidden confirmation paragraph, and resets the form.

### Key Components

1. **`contact.html`**
   - Standard HTML5 boilerplate with `lang="en"`, `charset="UTF-8"`, and `<meta name="viewport">`
   - `<link rel="stylesheet" href="contact.css">`
   - `<main>` element containing:
     - `<h1>Contact Us</h1>`
     - `<form id="contact-form">` with four child elements:
       - `<label for="name">` + `<input type="text" id="name" name="name" required>`
       - `<label for="email">` + `<input type="email" id="email" name="email" required>`
       - `<label for="message">` + `<textarea id="message" name="message" rows="5" required></textarea>`
       - `<button type="submit">Send Message</button>`
     - `<p id="success-msg" style="display:none">Thank you! Your message has been received.</p>`
   - Inline `<script>` block at bottom of `<body>`:
     ```html
     <script>
       document.getElementById('contact-form').addEventListener('submit', function(event) {
         event.preventDefault();
         document.getElementById('success-msg').style.display = 'block';
         event.target.reset();
       });
     </script>
     ```

2. **`contact.css`**
   - CSS reset: `*, *::before, *::after { box-sizing: border-box; } body { margin: 0; }`
   - Body: `font-family: sans-serif; background: #f9f9f9; color: #222; display: flex; flex-direction: column; align-items: center; padding: 2rem 1rem; min-height: 100vh;`
   - `main`: `width: 100%; max-width: 480px;`
   - `h1`: `margin-bottom: 1.5rem;`
   - `form`: `display: flex; flex-direction: column; gap: 1rem;`
   - `label`: `font-weight: bold; margin-bottom: 0.25rem; display: block;`
   - `input`, `textarea`: `width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem;`
   - `button`: `padding: 0.6rem 1.2rem; background: #333; color: #fff; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer;`
   - `button:hover`: `background: #555;`
   - `#success-msg`: `color: green; font-weight: bold; margin-top: 1rem;`

### Files to Create

- `contact.html` — contact form page at repository root
- `contact.css` — styles for the contact page at repository root

### Code Patterns to Follow

- **For overall HTML structure**: Follow the same boilerplate approach established in the project (no framework, no build step, plain HTML5 with `lang="en"` and `<meta charset="UTF-8">`)
- **For CSS structure**: Same CSS reset pattern (`box-sizing: border-box`, `margin: 0`, flex layout on body) as used for the landing page

**Anti-Patterns to Avoid:**

- Do not add `<script src="...">` pointing to an external JS file — keep the single small script inline
- Do not add any CDN links (fonts, icon libraries, CSS frameworks) — the page must be self-contained
- Do not set `form action` to any URL — leave it as the default or use `action="#"`; the JavaScript handler intercepts submission before any network request is made

---

## Implementation Steps

#### Phase 1: Create the Contact Page HTML

- [ ] Create `contact.html` in the repository root with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Contact — Hula</title>
  <link rel="stylesheet" href="contact.css">
</head>
<body>
  <main>
    <h1>Contact Us</h1>
    <form id="contact-form">
      <div>
        <label for="name">Name</label>
        <input type="text" id="name" name="name" placeholder="Your name" required>
      </div>
      <div>
        <label for="email">Email</label>
        <input type="email" id="email" name="email" placeholder="you@example.com" required>
      </div>
      <div>
        <label for="message">Message</label>
        <textarea id="message" name="message" rows="5" placeholder="Your message..." required></textarea>
      </div>
      <button type="submit">Send Message</button>
    </form>
    <p id="success-msg" style="display:none">Thank you! Your message has been received.</p>
  </main>

  <script>
    document.getElementById('contact-form').addEventListener('submit', function(event) {
      event.preventDefault();
      document.getElementById('success-msg').style.display = 'block';
      event.target.reset();
    });
  </script>
</body>
</html>
```

#### Phase 2: Create the Stylesheet

- [ ] Create `contact.css` in the repository root with the following content:

```css
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: sans-serif;
  background: #f9f9f9;
  color: #222;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem;
  min-height: 100vh;
}

main {
  width: 100%;
  max-width: 480px;
}

h1 {
  margin-bottom: 1.5rem;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

label {
  display: block;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

input,
textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
}

textarea {
  resize: vertical;
}

button {
  align-self: flex-start;
  padding: 0.6rem 1.2rem;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

button:hover {
  background: #555;
}

#success-msg {
  color: green;
  font-weight: bold;
  margin-top: 1rem;
}
```

#### Phase 3: Verify

- [ ] Open `contact.html` directly in a browser (via `file://` or a local HTTP server)
- [ ] Verify all three fields and the submit button are visible
- [ ] Fill out the form and click "Send Message"
- [ ] Verify the success message appears and the form fields are cleared
- [ ] Verify no network request is made (check browser DevTools → Network tab; no POST should appear)
- [ ] Resize browser to mobile width (~375px) and verify the form remains usable

---

## Edge Cases & Considerations

### Edge Cases to Handle

1. **Browser validation on required fields**: HTML5 `required` attribute on all inputs means the browser will prevent submission if any field is empty. No JavaScript validation needed — this is handled natively.
2. **Email format validation**: `type="email"` on the email input means the browser validates the format. No custom regex needed.
3. **Multiple submits**: If the user clicks Submit again after the success message is shown, the form resets again and the message remains visible. This is acceptable for a UI-only form.

### Potential Challenges

- ⚠️ **`file://` vs HTTP**: When opened via `file://` in some browsers, CSS `<link>` may load normally but behavior can differ. Testing via a local HTTP server (e.g. `python3 -m http.server`) or directly on GitHub Pages is recommended.
- ⚠️ **Textarea font**: By default, `<textarea>` uses a monospace font in some browsers. The `font-family: inherit` rule in `contact.css` ensures it matches the rest of the page.

### Security Considerations

- No data is transmitted — zero risk of data exposure
- No external scripts or resources are loaded — no third-party tracking or XSS surface
- The inline `<script>` block is minimal and does not accept or process any external input

---

## Technical Considerations

### Dependencies

- None. No npm packages, no CDN resources.

### Configuration Changes

- No changes to `.hublaunch/hublaunch.config.js` or any other configuration file

### Environment Variables

- None required

### Error Handling Strategies

- Browser-native HTML5 validation handles empty fields and invalid email formats (no custom error handling needed)
- The success message is the only UI state change — no error states required (form does not send data, so no network errors are possible)

---

## Testing Requirements

### Manual Testing Checklist

1. **Setup**: Open `contact.html` in a web browser (Chrome, Firefox, or Safari). No server setup required — `file://` works for this page.

2. **Test Case 1 — Form renders correctly**:
   - Open `contact.html`
   - Expected: Page shows `Contact Us` heading, three labeled fields (Name, Email, Message), and a "Send Message" button. Success message is not visible.

3. **Test Case 2 — Submit with all fields filled**:
   - Fill Name: "Test User", Email: "test@example.com", Message: "Hello"
   - Click "Send Message"
   - Expected: Success message "Thank you! Your message has been received." appears below the form. All form fields are cleared. Page does not navigate away.

4. **Test Case 3 — Browser validation on empty fields**:
   - Leave Name empty, fill Email and Message, click "Send Message"
   - Expected: Browser shows native validation error on the Name field. Form is not submitted.

5. **Test Case 4 — Browser validation on invalid email**:
   - Fill Name, enter "notanemail" in Email field, fill Message, click "Send Message"
   - Expected: Browser shows native validation error on the Email field.

6. **Test Case 5 — Mobile responsiveness**:
   - Open DevTools → Toggle device toolbar → Set width to 375px
   - Expected: Form fits within the viewport, all fields are accessible, no horizontal scrolling.

7. **Test Case 6 — No network request on submit**:
   - Open DevTools → Network tab → Clear log
   - Fill and submit the form
   - Expected: No network requests appear in the Network tab after submission.

### Unit Tests

None required. This is a static HTML page with no JavaScript modules, services, or functions to unit test. The behavior is verified entirely through manual testing.

### Integration Tests

None required. No external services or APIs are integrated.

---

## Documentation Updates

### Code Documentation

- No JSDoc or inline comments needed — the HTML and CSS are self-explanatory and the inline script is three lines

### User-Facing Documentation

- No README update required for this test implementation

---

## Acceptance Criteria

- [ ] **AC1**: `contact.html` exists in the repository root and opens in a browser without errors
- [ ] **AC2**: The page displays a `Contact Us` `<h1>` heading and a form with three labeled fields (Name, Email, Message) and a Submit button
- [ ] **AC3**: Submitting a filled-out form shows the success message "Thank you! Your message has been received." on the page without navigating away
- [ ] **AC4**: After submission, all form fields are cleared
- [ ] **AC5**: No network request is made when the form is submitted (verified via browser DevTools Network tab)
- [ ] **AC6**: HTML5 browser validation prevents submission when any required field is empty or email format is invalid
- [ ] **AC7**: The form is usable at 375px viewport width with no horizontal scrolling
- [ ] **AC8**: `contact.css` exists in the repository root and is correctly linked from `contact.html`

### Definition of Done

- All acceptance criteria met
- Page manually tested in at least one browser (Chrome or Firefox)
- No external resources loaded (verified in DevTools)

---

## Dependencies & Related Work

### Dependencies

- None — no external setup, services, or accounts required

### Blockers

- None

### Related Issues/PRs

- Related: Add Welcome Landing Page (`index.html`) — a previously planned companion page that has not yet been implemented. The contact page can be implemented independently. If the landing page is later implemented, consider adding a navigation link from `index.html` to `contact.html`.
