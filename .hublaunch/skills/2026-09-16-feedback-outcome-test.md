# Feedback Outcome Test — Single File Write

## Goal
Write one file and stop. This action exists only to exercise the
`outcomeType: feedback` code path end-to-end (no GitHub Issue, no commit, no
PR should ever result from this action, regardless of what it writes).

## Steps
1. Write a file named `feedback-test-output.md` at the repository root
   containing the current UTC timestamp (`date -u`) and the line
   `feedback outcome test run`.
2. Do not modify any other file.
3. Stop. Do not open a PR or issue — this action produces no reviewable
   change; it exists purely to prove the harness itself creates no PR/issue
   even though this step writes a file.

## Outcome
A single file `feedback-test-output.md` is created/updated with a timestamp.
Outcome type: feedback.
