# Add CONTRIBUTING.md Guide

## Plan Summary

- **Goal**: Create comprehensive CONTRIBUTING.md for testHubLaunch that welcomes open-source contributors and clarifies development workflow
- **Key decisions**: Include HubLaunch issue planning workflow; specify strict TypeScript + test requirements; provide full dev setup guide
- **Primary files**: Create `CONTRIBUTING.md` (root); update `README.md` to link to it
- **Complexity**: Low–Medium; mostly documentation with no code changes
- **Priority**: Establish community contribution standards early

## Problem Statement

testHubLaunch is a public GitHub repository testing HubLaunch CLI features, but has no contribution guidelines. New contributors don't know:
- How to set up the dev environment
- What code quality is expected
- How to submit changes (branch naming, commit convention, PR process)
- What testing/documentation is required
- How HubLaunch issue planning integrates with contributions

Without clear guidance, PRs will be inconsistent and onboarding friction is high.

## Proposed Solution

Create `CONTRIBUTING.md` at the root that covers:
1. **Welcome + Contribution Types** — what kinds of PRs are wanted
2. **Development Setup** — node version, npm install, running scripts, type-checking
3. **Code Standards** — TypeScript strict mode, JSDoc, no secrets in code, accessibility of scripts
4. **Git Workflow** — branch naming (`feature/`, `fix/`, `docs/`), conventional commits, PR title format
5. **Testing & Validation** — unit tests, integration tests, manual testing instructions
6. **HubLaunch Integration** — how issues/plans flow through `/hula-plan` and `/hula-launch`
7. **Documentation** — README updates, code comments, API docs in JSDoc
8. **Review Process** — what to expect, checklist for reviewers
9. **Release & Deployment** — (minimal; this is a test project, but note it)

Link to CONTRIBUTING.md prominently in README.md.

## Implementation Steps

### Phase 1: Create CONTRIBUTING.md

**File**: `CONTRIBUTING.md` (root)

Content structure:
```
# Contributing to testHubLaunch

## Welcome

- Small PRs welcome (bug fixes, new scripts, test improvements)
- Large features → open an issue first (discuss scope via GitHub Issues)
- Maintenance PRs (deps, docs, tooling) always welcome
- Questions? Open a Discussion or comment on an issue

## Getting Started

### Prerequisites
- Node ≥ 18 (required for ES2022 + `fetch`)
- Node ≥ 22.6 for direct `.ts` execution; else use `tsx` (npm install-ed)

### Local Setup
```
git clone https://github.com/thabungm/testHubLaunch.git
cd testHubLaunch
npm install
npm run typecheck
```

### Running Scripts
- `npm run contact` → smoke test (send sample submission to Slack)
- `npm run test:contact` → live test + validation checks (requires SLACK_URL set)
- `npm run typecheck` → type-check all `.ts` files (strict mode)

### Environment Variables
- `SLACK_URL` — Slack Incoming Webhook URL (never commit, use `.env`)
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
- Project uses zero npm deps at runtime (only devDeps: tsx, typescript, @types/node)
- Keep it that way — solutions must use only Node built-ins (`fetch`, `Buffer`, etc.)
- Test must work in Node 18+ with zero npm install overhead

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

Examples:
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

**Types**: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`
**Scope**: optional, e.g., `contact`, `validation`, `slack`, `deps`

**Examples**:
```
feat(contact): add email domain allowlist validation
fix(validation): fix regex accepting invalid emails with multiple @
docs(setup): add Node version requirements
chore(deps): bump TypeScript 5→6
test(contact): add validation test for mixed-case emails
```

### Pull Requests

**Title format**: Use the commit type/scope in the title:
- `feat(contact): add email domain allowlist`
- `fix(validation): reject emails with spaces`
- `docs: update CONTRIBUTING with testing guide`

**Body**: Explain *why*, not just what. Reference issues if applicable:
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
- Mock Slack endpoint or use a test webhook (from SLACK_URL)
- Verify HTTP 200 response, body = "ok"
- Verify no Slack call if validation fails

### Manual Testing
Before submitting PR:
1. Run `npm run typecheck` — must pass
2. Run `npm run test:contact` with valid SLACK_URL set
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

**If you're implementing a planned issue**:
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
```

### Phase 2: Update README.md

Add a "Contributing" section link near the top:

```markdown
## Contributing

Interested in contributing? See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, code standards, testing, and the HubLaunch workflow.
```

Or add to existing "Contributing" section if one exists.

### Phase 3: Verify & Validate

- [ ] CONTRIBUTING.md is readable and complete
- [ ] No broken links (all referenced files exist)
- [ ] Code examples are accurate (match actual scripts/types)
- [ ] Git workflow examples match project's recent commits
- [ ] HubLaunch references point to actual config files

## Technical Considerations

### Dependencies
- CONTRIBUTING.md is a markdown file — no new npm dependencies
- No code changes, so no breaking changes

### Security
- Document that `.env` must never be committed
- Warn against hardcoding secrets in scripts
- Note that Slack URL is a secret and should not be logged

### Maintenance
- Keep CONTRIBUTING.md in sync with actual workflows as they evolve
- Update Node version requirements if they change
- Update npm script names if refactored
- Review annually to catch outdated patterns

### GitHub Integration
- Optionally enable "branch protection rules" that enforce PR reviews + required status checks (beyond scope of this plan, but CONTRIBUTING.md makes such rules clear)

## Testing Strategy

### Manual Testing
1. Read CONTRIBUTING.md end-to-end
2. Verify all commands work:
   - `npm install`
   - `npm run typecheck`
   - `npm run contact`
   - `npm run test:contact`
3. Check all links (to issues, docs, external resources)
4. Verify code examples match actual files

### Content Validation
- All env var names match actual usage (`SLACK_URL`)
- Branch name examples match recent commits
- Commit message format matches `.git/logs/HEAD`
- Section headers are clear and well-organized

### Reviewer Checklist
- Tone is welcoming and encouraging
- Instructions are clear for first-time contributors
- No assumptions about prior knowledge
- Examples are concrete and runnable

## Documentation Updates

### Files to Create/Update
1. **CONTRIBUTING.md** — new file at root
2. **README.md** — add link to CONTRIBUTING.md in intro or "Getting Started" section

### No Other Documentation Changes
- API documentation is in README.md and JSDoc comments
- Architecture docs are in `.hublaunch/` planning instructions
- Deployment docs not needed (this is a test project)

## Acceptance Criteria

✅ CONTRIBUTING.md exists at project root
✅ README.md links to CONTRIBUTING.md
✅ CONTRIBUTING.md covers: setup, code standards, git workflow, testing, docs, review process, HubLaunch integration
✅ All commands in CONTRIBUTING.md work (verified manually)
✅ Code examples match actual project files
✅ Env vars documented (`SLACK_URL`)
✅ No broken links or typos
✅ Tone is welcoming and clear
✅ Suitable for first-time open-source contributors
