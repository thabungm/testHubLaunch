# Add a "Running Tests Locally" Note to README.md

## Plan Summary

- **What/why**: Regression probe for the HubLaunch hosted-launch sandbox image (validating PR https://github.com/NoStackApp/hula-server/pull/678 doesn't break a standard Node/TypeScript launch). Adds one small, low-risk documentation section to `README.md`.
- **Key decision**: Trivial, single-file documentation change — deliberately minimal so the launch pipeline (check/build/PR) is the thing under test, not the change itself.
- **Most important file**: `README.md`.
- **Priority/complexity**: Low priority, Simple.

## Problem Statement

`README.md` documents the API and notes for this project but has no section telling a reader how to actually run the type-check and test scripts locally. Add a short "Running Tests Locally" section near the existing "## Notes" section.

## Proposed Solution

Add a new `## Running Tests Locally` section to `README.md`, placed directly before the existing `## Notes` section, with two bullet points:

- `npm run typecheck` — runs `tsc --noEmit`.
- `npm run test:contact` — runs the input-validation check and a live Slack send (requires `SLACK_URL` in `.env`).

## Implementation Steps

- [ ] Insert the new `## Running Tests Locally` section into `README.md` immediately before the existing `## Notes` section, with the two bullets listed above.

## Acceptance Criteria

- [ ] `README.md` contains a `## Running Tests Locally` section with the two documented commands.
- [ ] No other file is changed.
- [ ] `npm run typecheck` still passes (this change is documentation-only, so it must not affect type-checking).
