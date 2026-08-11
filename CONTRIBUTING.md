# Contributing to testHubLaunch

## Welcome

Thank you for your interest in contributing! We welcome:

- **Small PRs** — bug fixes, new scripts, test improvements
- **Large features** — open an issue first to discuss scope
- **Maintenance PRs** — dependency updates, docs, tooling improvements
- **Questions?** Open a GitHub Discussion or comment on an issue

## Getting Started

### Prerequisites

- **Node ≥ 18** (required for ES2022 + `fetch`)
  - Node ≥ 22.6 for direct `.ts` execution
  - Otherwise use `tsx` (installed as devDependency)

### Local Setup

```bash
git clone https://github.com/thabungm/testHubLaunch.git
cd testHubLaunch
npm install
npm run typecheck
```

### Running Scripts

- `npm run contact` — smoke test (send sample submission to Slack)
- `npm run test:contact` — live test + validation checks (requires `SLACK_URL` set)
- `npm run typecheck` — type-check all `.ts` files (strict mode)

### Environment Variables

- **`SLACK_URL`** — Slack Incoming Webhook URL (never commit, use `.env`)
- Load: `set -a; source .env; set +a` before running scripts

## Code Standards

### TypeScript

- **Strict mode enforced** — `tsc --noEmit --strict`
- All functions must have types (no `any`)
- Export interfaces for public APIs
- Use JSDoc for exported functions/classes:

  ```typescript
  /**
   * Validate contact submission. Throws ContactValidationError if any issue found.
   * @param input - ContactInput with name, email, subject, body
   * @throws {ContactValidationError} - if validation fails; check `.issues` array
   */
  export function validateContact(input: ContactInput): void { ... }
  ```

### No Runtime Dependencies

- Project uses zero npm dependencies at runtime (only devDeps: `tsx`, `typescript`, `@types/node`)
- Keep it that way — solutions must use only Node built-ins (`fetch`, `Buffer`, etc.)
- Tests must work in Node 18+ with zero npm install overhead

### Secrets & Security

- **Never** commit `.env`, API keys, webhook URLs, or personal access tokens
- `.env` is gitignored; scripts read from `process.env` only
- Document which env vars are required in README / script comments

## Git Workflow

### Branch Naming

```
feature/description          (new features, scripts)
fix/description              (bug fixes)
docs/description             (README, comments, CONTRIBUTING updates)
chore/description            (deps, build config, maintenance)
test/description             (test files, test infrastructure)
```

**Examples:**

- `feature/slack-formatting` — new Slack Block Kit logic
- `fix/email-validation-regex` — improve email pattern
- `docs/setup-guide` — expand development setup docs
- `chore/typescript-bump` — upgrade TypeScript version

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

Optional body with details.
```

**Types:** `feat`, `fix`, `docs`, `chore`, `test`, `refactor`  
**Scope:** optional, e.g., `contact`, `validation`, `slack`, `deps`

**Examples:**

```
feat(contact): add email domain allowlist validation
fix(validation): fix regex accepting invalid emails with multiple @
docs(setup): add Node version requirements
chore(deps): bump TypeScript 5→6
test(contact): add validation test for mixed-case emails
```

### Pull Requests

**Title format:** Use the commit type/scope in the title:

- `feat(contact): add email domain allowlist`
- `fix(validation): reject emails with spaces`
- `docs: update CONTRIBUTING with testing guide`

**Body:** Explain *why*, not just what. Reference issues if applicable:

```
Closes #123

## Changes

- Added domain allowlist to email validation
- Reads ALLOWED_DOMAINS from env

## Testing

- Unit test: `describe('domain allowlist')`
- Manual: `npm run test:contact` passes
```

## Testing

### Unit Tests (TypeScript strict mode)

- Test all exported functions: `validateContact`, `buildSlackPayload`, `submitContactForm`
- Cover happy path + all error cases
- Test edge cases: empty strings, whitespace-only, invalid emails, etc.
- Example in `test-contact.ts`: validation errors, then success case

### Integration Tests

- Mock Slack endpoint or use a test webhook (from `SLACK_URL`)
- Verify HTTP 200 response, body = `"ok"`
- Verify no Slack call if validation fails

### Manual Testing

Before submitting a PR:

1. Run `npm run typecheck` — must pass
2. Run `npm run test:contact` with valid `SLACK_URL` set
3. Run `npm run contact` with sample data
4. Check that Slack message arrives formatted correctly

## Documentation

### README Updates

- If adding a new script: document in Usage section with example
- If changing behavior: update Requirements or API sections
- If adding env vars: document in Setup section
- If adding types: document in API section with example

### Code Comments

- JSDoc for all exported functions/classes (see Code Standards)
- Inline comments only for non-obvious logic (why, not what)
- Update comments if you change behavior

### API Documentation

- Keep README.md's "API" section in sync with actual exports
- List signature, parameters, return value, exceptions
- Include example for each exported function

## HubLaunch Integration

This project uses [HubLaunch](https://github.com/NoStackApp/hub-launch) for issue planning and automated implementation.

### For Contributors

**If you want to propose a feature** (not a quick bug fix):

1. Open a GitHub Issue describing the feature
2. Wait for maintainer to create a plan using `/hula-plan` (or do it yourself if you have access)
3. The plan is automatically validated and a GitHub issue is created
4. Implementation happens via `/hula-launch` workflow

**If you're implementing a planned issue:**

- The plan file (in `.hublaunch/plans/`) contains all details
- Follow the Implementation Steps exactly
- PR should reference the issue number

### For Maintainers

- Use `hula-plan add <description>` to create a structured plan
- Plans auto-validate and generate GitHub issues
- Use `hula-launch <issue-name>` to run AI-assisted implementation in a sandbox

See `.hublaunch/planning-instructions.md` and `.hublaunch/proceed-instructions.md` for details.

## Review Process

### What Reviewers Check

- ✅ TypeScript strict mode passes (`npm run typecheck`)
- ✅ Tests added/updated for new behavior
- ✅ No secrets or `.env` committed
- ✅ Commit messages follow Conventional Commits
- ✅ Branch naming convention followed
- ✅ README/docs updated if behavior changes
- ✅ No new npm dependencies (unless discussed in issue first)

### PR Checklist (for contributors)

Before submitting:

- [ ] Branch name matches convention (`feature/`, `fix/`, `docs/`, etc.)
- [ ] Commits follow Conventional Commits format
- [ ] `npm run typecheck` passes
- [ ] `npm run test:contact` passes (if touching contact logic)
- [ ] Updated README if behavior changed
- [ ] Added JSDoc for new exported functions
- [ ] No `.env` or secrets in code

### Reviewer Checklist

- [ ] All contributor checklist items verified
- [ ] Code logic is correct (test coverage, edge cases)
- [ ] No security issues (secrets, injection, etc.)
- [ ] Commit history is clean (one logical change per commit)
- [ ] PR title + body are clear

## Release & Deployment

testHubLaunch is a test/demo project. No formal releases, but:

- Main branch is always stable
- All PRs merged to main go through full validation
- Breaking changes require discussion in an issue first
- Tag milestones when hitting significant feature goals (e.g., `v1.0.0`)

## Getting Help

- **Questions?** Open a GitHub Discussion
- **Found a bug?** Open a GitHub Issue with reproduction steps
- **Want to discuss a feature?** Open an issue first (before big PRs)
- **Stuck on setup?** Comment on this CONTRIBUTING.md or ask in a Discussion

## Code of Conduct

Be respectful. All contributors are expected to uphold a standard of professionalism and courtesy.

---

**Happy contributing!** Questions? Ask in a Discussion or comment on an issue. We're here to help.
