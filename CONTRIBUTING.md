# Contributing to testHubLaunch

## Welcome

Thank you for your interest in contributing to testHubLaunch! We welcome contributions of all sizes:

- **Bug fixes** — found a problem? Fix it and open a PR
- **New scripts** — have a test or utility you'd like to add? Let's discuss in an issue first
- **Test improvements** — better coverage, edge cases, performance tests all welcome
- **Documentation** — README updates, comments, CONTRIBUTING improvements, typo fixes
- **Maintenance** — dependency updates, tooling improvements, code quality enhancements

**Large features?** Please open an issue first to discuss scope and design. This helps us align on vision before you invest time.

**Questions?** Open a GitHub Discussion or comment on an issue. We're here to help.

## Getting Started

### Prerequisites

- **Node ≥ 18** — required for ES2022 features and the global `fetch` API
- **Node ≥ 22.6** — to run `.ts` files directly without additional tooling

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/thabungm/testHubLaunch.git
   cd testHubLaunch
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Type-check to confirm setup:**
   ```bash
   npm run typecheck
   ```

### Running Scripts

The project includes two main scripts:

- **Smoke test (send sample data to Slack):**
  ```bash
  npm run contact
  ```
  Sends a hard-coded test submission and verifies HTTP 200 response.

- **Full test (validation + live send):**
  ```bash
  npm run test:contact
  ```
  Performs a real Slack send (requires `SLACK_URL` set) plus validation checks.

- **Type-check (verify TypeScript):**
  ```bash
  npm run typecheck
  ```
  Runs TypeScript in strict mode across all `.ts` files. This **must** pass before submitting a PR.

### Environment Variables

- **`SLACK_URL`** — Your Slack Incoming Webhook URL (a secret, never commit)

To use it locally:

1. Create a `.env` file at the project root (`.env` is gitignored):
   ```
   SLACK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX
   ```

2. Load it before running scripts:
   ```bash
   set -a; source .env; set +a
   npm run test:contact
   ```

Or run inside the HubLaunch container, which forwards `SLACK_URL` automatically.

## Code Standards

### TypeScript

- **Strict mode enforced.** All files are type-checked with `tsc --noEmit --strict`
- **No `any` types.** Every function parameter, return value, and variable must have an explicit type
- **Export interfaces for public APIs.** If a type is part of the public API, export it from the module
- **JSDoc for exported functions.** Every exported function or class must have a JSDoc comment:

  ```typescript
  /**
   * Validate a contact form submission. Throws ContactValidationError if validation fails.
   * @param input - A ContactInput object with name, email, subject, and body
   * @throws {ContactValidationError} - If any field is invalid; check the `.issues` array for details
   * @returns void (throws on error)
   */
  export function validateContact(input: ContactInput): void {
    // ...
  }
  ```

### No Runtime Dependencies

This project has **zero npm dependencies at runtime.** Keep it that way.

- Solutions must use only Node built-ins (`fetch`, `Buffer`, `URL`, `crypto`, etc.)
- Dev dependencies (`tsx`, `typescript`, `@types/node`) are OK
- If you need a library, discuss it in an issue first — we prefer simplicity and minimal footprint

### Secrets & Security

- **Never commit `.env`, API keys, webhook URLs, or personal access tokens**
- `.env` is in `.gitignore` — use it locally only
- Scripts read secrets from `process.env` only, never parse `.env` or hardcode values
- Slack webhook URLs are secrets: don't log them, don't include them in error messages
- If you accidentally commit a secret, contact the maintainers immediately

## Git Workflow

### Branch Naming

Use a consistent naming convention to make branches self-documenting:

```
feature/<description>    (new features, new scripts)
fix/<description>        (bug fixes)
docs/<description>       (documentation updates, README, CONTRIBUTING, comments)
chore/<description>      (dependencies, build config, tooling, maintenance)
test/<description>       (test files, test infrastructure improvements)
```

**Examples:**
- `feature/slack-block-formatting` — new Slack Block Kit logic
- `fix/email-validation-edge-cases` — improve email regex
- `docs/setup-guide-update` — expand development setup docs
- `chore/typescript-upgrade` — upgrade TypeScript version
- `test/contact-validation-coverage` — add missing test cases

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): description

Optional body with details.
```

**Types:** `feat`, `fix`, `docs`, `chore`, `test`, `refactor`
**Scope:** Optional; usually the module or feature affected (e.g., `contact`, `validation`, `slack`)

**Examples:**
```
feat(contact): add domain allowlist validation

Adds ALLOWED_DOMAINS environment variable to restrict submissions
to specific email domains. Validation occurs before Slack submission.

docs(setup): add Node version requirements to README

Clarify that Node 18+ is required for fetch, and 22.6+ for direct TS execution.

fix(validation): handle emails with whitespace correctly

Email regex now rejects emails containing spaces, matching RFC 5322 more closely.
```

### Pull Requests

**Title:** Use the commit type/scope format:
- `feat(contact): add email domain allowlist`
- `fix(validation): reject emails with spaces`
- `docs: expand setup instructions`

**Body:** Explain **why**, not just what. Reference issues if applicable:

```markdown
Closes #123

## Changes
- Added domain allowlist to email validation
- Reads ALLOWED_DOMAINS from env var
- Validation happens before Slack submission

## Testing
- Unit test: `describe('domain allowlist')` in test-contact.ts
- Manual: `npm run test:contact` passes with test domain
- Manual: Real Slack send with blocked domain rejected before HTTP call
```

## Testing

### Unit Tests

All exported functions must have test coverage in `scripts/test-contact.ts`:

- **Happy path:** Valid input produces expected output
- **Error cases:** Invalid input throws `ContactValidationError` with correct `issues` array
- **Edge cases:** Whitespace-only fields, empty strings, special characters, max length truncation

**Example (from test-contact.ts):**
```typescript
// Validation test: missing required fields
const invalid = { name: '', email: 'user@example.com', subject: '', body: '' };
try {
  validateContact(invalid);
  console.log('FAIL: should reject empty fields');
} catch (err) {
  if (err instanceof ContactValidationError) {
    console.log('PASS (validation): rejected 4 invalid fields');
  }
}
```

### Integration Tests

- Mock or test against a real Slack webhook (from `SLACK_URL`)
- Verify HTTP 200 response and `body: ok`
- Verify no Slack call if validation fails (validation errors block network calls)

### Manual Testing

Before opening a PR, run these steps:

1. **Type-check must pass:**
   ```bash
   npm run typecheck
   ```
   No errors or warnings.

2. **Test the live flow with SLACK_URL set:**
   ```bash
   set -a; source .env; set +a
   npm run test:contact
   ```
   Both the live test and validation test must print `PASS`.

3. **Smoke test:**
   ```bash
   npm run contact
   ```
   Should print `Contact submitted to Slack (HTTP 200)` and exit with code 0.

4. **Verify Slack message:** Check the Slack workspace to confirm the message arrived formatted correctly, with all fields populated.

## Documentation

### README Updates

If your change affects end-users or contributors, update `README.md`:

- **Adding a new script?** Document it in the Usage section with example command and expected output
- **Changing behavior?** Update the API section and Requirements section
- **Adding env vars?** Document in the Setup section
- **Adding types?** Document in the API section with example usage

### Code Comments

- **JSDoc for all exported functions and classes** (see Code Standards above)
- **Inline comments only for non-obvious logic.** Explain *why*, not *what*:
  - ✅ `// Email regex requires non-empty local/domain parts to prevent "a@b" style addresses`
  - ❌ `// Check if email has @ symbol` (obvious from the code)
- **Update comments if you change behavior.** Stale comments mislead future readers.

### API Documentation

Keep the README's "API" section in sync with actual exports:

- List function signatures, parameters, return values, and exceptions
- Include a code example for each exported function
- Note any TypeScript types that are part of the public API

## HubLaunch Integration

This project uses [HubLaunch](https://github.com/NoStackApp/hub-launch) for structured issue planning and AI-assisted implementation.

### For Contributors

**If you want to propose a feature** (not a quick bug fix):

1. Open a GitHub Issue describing the feature and motivation
2. A maintainer will create a plan using `/hula-plan` and design it in an issue
3. Implementation happens via `/hula-launch` in a sandboxed agent session
4. The plan details will guide implementation
5. Open a PR referencing the GitHub issue once the plan is complete

**If you're implementing a planned issue:**

- The plan file (in `.hublaunch/plans/`) contains detailed implementation steps
- Follow the Implementation Steps exactly — they specify files to create/modify, validation steps, etc.
- Reference the issue number in your PR: `Closes #123`
- Run validation commands to confirm everything works

### For Maintainers

- Use `hula-plan add "<description>"` to create a structured plan for new features
- Plans auto-validate and generate GitHub issues
- Use `hula-launch <issue-name>` to run AI-assisted implementation in a sandbox
- Review the resulting PR for quality, security, and correctness

For details, see:
- `.hublaunch/planning-instructions.md`
- `.hublaunch/proceed-instructions.md`

## Review Process

### What Reviewers Check

- ✅ `npm run typecheck` passes (zero errors/warnings)
- ✅ Tests added or updated for new/changed behavior
- ✅ No secrets or `.env` files committed
- ✅ Commit messages follow Conventional Commits format
- ✅ Branch name follows the naming convention (`feature/`, `fix/`, `docs/`, etc.)
- ✅ README and API docs updated if behavior changes
- ✅ No new npm dependencies added (or discussed in issue first)
- ✅ JSDoc comments added for new exported functions
- ✅ Code logic is correct (test coverage, edge cases)
- ✅ No security issues (injection, secret leaks, etc.)

### PR Checklist for Contributors

Before submitting, verify:

- [ ] Branch name matches convention (`feature/`, `fix/`, `docs/`, `chore/`, or `test/`)
- [ ] Commits follow Conventional Commits format (`type(scope): description`)
- [ ] `npm run typecheck` passes with zero errors/warnings
- [ ] `npm run test:contact` passes (if touching contact logic)
- [ ] Updated README if behavior changed
- [ ] Added JSDoc comments for new exported functions
- [ ] No `.env` or secrets in code
- [ ] Added/updated tests for new behavior

### Reviewer Checklist

- [ ] All contributor checklist items verified
- [ ] Code logic is sound (test coverage adequate, edge cases handled)
- [ ] No security issues (secrets, injection vulnerabilities, etc.)
- [ ] Commit history is clean (logical changes per commit, no fixup commits)
- [ ] PR title and body are clear and reference issues if applicable

## Release & Deployment

testHubLaunch is a test/demo project for HubLaunch features. No formal releases or deployments, but:

- **Main branch is always stable.** All PRs merged to main go through full validation.
- **Breaking changes require discussion** in an issue first before implementation.
- **Tag milestones** when hitting significant feature goals (e.g., `v1.0.0`) for reference.

## Getting Help

- **Questions about setup or workflow?** Open a GitHub Discussion
- **Found a bug?** Open a GitHub Issue with reproduction steps
- **Want to discuss a feature?** Open an issue first (before writing code)
- **Stuck on development?** Comment on an issue or discussion — we're happy to help

## Code of Conduct

All contributors are expected to uphold a standard of professionalism and courtesy. Be respectful of others' time and perspectives.

---

**Happy contributing!** We look forward to working with you. If you have questions, ask in a Discussion or comment on an issue.
