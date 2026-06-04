# Add Welcome Landing Page with Under Construction Notice

## Problem Statement

The `thabungm/testHubLaunch` repository currently has no public-facing web presence. A simple landing page is needed to greet visitors, establish the project's identity, and communicate that the site is under active development.

### Planning Context

> **Note**: This section captures key requirements to provide complete context for implementation.

**Key Requirements Discussed:**

- The page must display "Welcome to Hula" as the primary heading
- The page must visually communicate an "under construction" status
- The implementation must be as simple as possible (plain HTML + CSS, no build tools or frameworks)
- No interactivity beyond basic page rendering is needed

**Decisions Made:**

- Plain static HTML chosen over React/Next.js/Vite because the workspace has no existing package.json, no framework, and the feature is described as "very simple"
- GitHub Pages deployment chosen because the repo has a `.github/` directory and no other server infrastructure exists
- Single `index.html` file approach — no JavaScript required
- Inline or same-directory CSS for simplicity (no bundler needed)

**Out of Scope:**

- Navigation, routing, or multiple pages
- Backend or API integration
- Authentication
- Animations (beyond simple CSS)
- CMS or dynamic content

#### Background & Context

- **Why needed**: The project has no web presence; visitors to the repo or the deployed URL see nothing
- **Current state**: The repository root contains only an empty `test` file and HubLaunch configuration; no `index.html` exists
- **Who is affected**: Anyone visiting the deployed site or the GitHub Pages URL for this repository

**Current Behavior**: Visiting the GitHub Pages URL returns a 404 or blank page.

**Desired Behavior**: Visiting the site shows a styled welcome page with the heading "Welcome to Hula" and a clear under-construction notice.

---

## Detailed Requirements

### Functional Requirements

1. **Welcome Heading**
   - Display `Welcome to Hula` as the primary `<h1>` heading
   - Must be immediately visible above the fold

2. **Under Construction Notice**
   - Display a visually distinct "Under Construction" section
   - Include a short explanatory message such as "We're working hard to bring you something great. Check back soon."
   - Use a recognizable under-construction visual cue (e.g., construction icon emoji 🚧 or similar)

3. **Page Title**
   - Browser `<title>` must be set to `Hula — Coming Soon`

4. **Responsive Layout**
   - Page must be readable on both desktop and mobile (use `meta viewport` tag)

### Technical Requirements

- **Technology**: Plain HTML5 + CSS3 (no JavaScript required)
- **Files to create**:
  - `index.html` — main page
  - `styles.css` — page styles (linked from `index.html`)
- **No dependencies**: No npm, no build step, no framework
- **GitHub Pages compatibility**: Files in the repository root are served directly by GitHub Pages

### Non-Functional Requirements

- **Performance**: Page must load with a single HTTP request (no external fonts, no CDN dependencies; self-contained)
- **Accessibility**: Use semantic HTML (`<main>`, `<h1>`, `<p>`); `lang="en"` on `<html>`
- **Security**: No inline `<script>` tags, no external resources that could introduce third-party tracking
- **Backwards Compatibility**: No existing pages to break

---

## Proposed Solution

Create two files in the repository root:
1. `index.html` — a minimal HTML5 page with semantic structure
2. `styles.css` — simple centered layout with a welcoming style and a distinct under-construction banner

### Key Components

1. **`index.html`**
   - Standard HTML5 boilerplate
   - `<meta name="viewport">` for mobile responsiveness
   - Links to `styles.css`
   - `<main>` containing:
     - `<h1>Welcome to Hula</h1>`
     - An under-construction `<section>` with icon, heading, and short message

2. **`styles.css`**
   - CSS reset (`box-sizing: border-box`, `margin: 0`)
   - Centered flex layout for the `<body>`
   - Distinct styling for the under-construction banner (yellow/amber background, dark text)
   - Responsive font sizes using relative units (`em`/`rem`)

### Files to Create

- `index.html` — main landing page (new file)
- `styles.css` — stylesheet (new file)

### Code Patterns to Follow

No existing code to follow — this is a greenfield project. Use standard HTML5/CSS3 conventions.

**Reference implementation structure for `index.html`:**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hula — Coming Soon</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main>
      <h1>Welcome to Hula</h1>
      <section class="under-construction" aria-label="Under construction notice">
        <p class="icon" aria-hidden="true">🚧</p>
        <h2>Under Construction</h2>
        <p>We're working hard to bring you something great. Check back soon.</p>
      </section>
    </main>
  </body>
</html>
```

**Reference implementation structure for `styles.css`:**

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
  color: #212529;
  padding: 1.5rem;
}

main {
  text-align: center;
  max-width: 480px;
  width: 100%;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 2rem;
  color: #1a1a2e;
}

.under-construction {
  background-color: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  padding: 2rem 1.5rem;
}

.under-construction .icon {
  font-size: 3rem;
  margin-bottom: 0.75rem;
}

.under-construction h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #664d03;
}

.under-construction p:last-child {
  font-size: 0.95rem;
  color: #856404;
}
```

---

## Implementation Steps

### Phase 1: Create the Landing Page Files

- [ ] Create `index.html` in the repository root with the structure shown above (exact content from the reference implementation)
- [ ] Create `styles.css` in the repository root with the styles shown above (exact content from the reference implementation)

### Phase 2: Verify GitHub Pages Configuration

- [ ] Check `.github/` directory for any existing GitHub Pages workflow (`workflows/pages.yml` or similar)
- [ ] If no Pages workflow exists, create `.github/workflows/pages.yml` to deploy the root of the `main` branch to GitHub Pages using the standard `actions/deploy-pages` action:

  ```yaml
  name: Deploy to GitHub Pages
  on:
    push:
      branches: [main]
  permissions:
    contents: read
    pages: write
    id-token: write
  jobs:
    deploy:
      runs-on: ubuntu-latest
      environment:
        name: github-pages
        url: ${{ steps.deployment.outputs.page_url }}
      steps:
        - uses: actions/checkout@v4
        - uses: actions/configure-pages@v5
        - uses: actions/upload-pages-artifact@v3
          with:
            path: '.'
        - id: deployment
          uses: actions/deploy-pages@v4
  ```

- [ ] Verify GitHub Pages is enabled on the repository settings (set source to "GitHub Actions" if using the workflow above)

### Phase 3: Validation

- [ ] Open `index.html` locally in a browser and confirm:
  - Page title shows "Hula — Coming Soon" in the browser tab
  - `<h1>` reads "Welcome to Hula"
  - Under-construction section is visible with 🚧 icon, "Under Construction" heading, and the descriptive text
  - Layout is centered and readable
- [ ] Resize browser window to a narrow viewport (< 400px) and confirm the text remains readable (no horizontal scroll, no overflow)

---

## Edge Cases & Considerations

### Edge Cases to Handle

1. **No GitHub Pages enabled on the repo**: The workflow file will fail silently if Pages isn't activated in repository settings. The implementation step explicitly notes to verify this in GitHub Settings → Pages.
2. **Browser with no emoji support**: The 🚧 emoji is `aria-hidden="true"` so screen readers skip it. Visual fallback is acceptable (empty space) — the "Under Construction" heading provides the text equivalent.
3. **Very narrow viewports (< 320px)**: The `padding: 1.5rem` on `body` combined with `max-width: 480px` ensures content is padded; no scrollbar expected. Minimum viewport is 320px per web standards.

### Potential Challenges

- ⚠️ **GitHub Pages activation**: Pages must be manually enabled in the repo settings. The workflow file alone is not sufficient — a human must enable it once in GitHub → Settings → Pages → Source → "GitHub Actions".
- ⚠️ **Existing root `index.html`**: No existing `index.html` was found in the repo at planning time, so no conflicts expected. If one is found during implementation, do not overwrite without confirming with the repository owner.

### Security Considerations

- No `<script>` tags — no XSS surface
- No external resources (fonts, CDN) — no third-party tracking
- No form inputs — no data handling
- `lang="en"` on `<html>` for accessibility compliance

---

## Technical Considerations

### Dependencies

- None — plain HTML/CSS requires no npm packages or runtime dependencies

### Configuration Changes

- None to `.hublaunch/hublaunch.config.js`

### Environment Variables

- None required

### API Rate Limiting

- Not applicable

### Error Handling Strategies

- Not applicable for a static HTML page

---

## Testing Strategy

### Unit Tests

- Not applicable for plain HTML/CSS (no JavaScript logic)

### Integration Tests

- Not applicable (no API or data layer)

### Manual Testing Checklist

1. **Local browser test**
   - Open `index.html` directly in a browser (file:// protocol)
   - Expected: Page renders with "Welcome to Hula" heading and under-construction section
   - Expected: Page title in browser tab reads "Hula — Coming Soon"

2. **Mobile viewport test**
   - Open browser DevTools → toggle device toolbar → select 375px width (iPhone SE)
   - Expected: Content is centered, text is readable, no horizontal scrollbar

3. **Screen reader smoke test** (optional but recommended)
   - Enable macOS VoiceOver (Cmd + F5) and navigate to the page
   - Expected: VoiceOver announces "Welcome to Hula" then "Under Construction" then the descriptive text; does NOT read the 🚧 emoji

4. **GitHub Pages deployment test**
   - Push changes to `main`
   - Expected: GitHub Actions workflow runs successfully and the page is accessible at the GitHub Pages URL

---

## Documentation Updates

### User-Facing Documentation

- [ ] No `README.md` updates required (this is a placeholder page, not a feature for users to invoke)

### Code Documentation

- [ ] Add an HTML comment inside `index.html` above the `<section>` describing intent:
  ```html
  <!-- Under construction notice: replace this section when the site launches -->
  ```

---

## Acceptance Criteria

- [ ] **AC1**: `index.html` exists in the repository root and can be opened in a browser
- [ ] **AC2**: The page displays `Welcome to Hula` as the primary heading (`<h1>`)
- [ ] **AC3**: The page displays a visible under-construction notice with the 🚧 icon, an "Under Construction" heading, and an explanatory message
- [ ] **AC4**: The browser tab title reads `Hula — Coming Soon`
- [ ] **AC5**: The page is readable on a 375px-wide viewport without horizontal scroll
- [ ] **AC6**: No JavaScript is used anywhere on the page
- [ ] **AC7**: The page contains no external resource links (no CDN fonts, no external images, no third-party scripts)
- [ ] **AC8**: (If GitHub Pages workflow added) The workflow succeeds on push to `main` and the page is publicly accessible

### Definition of Done

- All acceptance criteria met
- Both `index.html` and `styles.css` committed to `main`
- GitHub Pages workflow file present (or confirmed not needed if Pages is already configured)
- Page renders correctly in Chrome, Firefox, and Safari

---

## Dependencies & Related Work

### Dependencies

- None

### Blockers

- GitHub Pages must be manually enabled in repository settings by a human with admin access to `thabungm/testHubLaunch`

### Related Issues/PRs

- None
