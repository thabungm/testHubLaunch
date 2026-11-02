# [DISPOSABLE E2E TEST] e2e-ecffe6e-c17

## Plan Summary

- Disposable end-to-end test launch created by hula-e2e run `e2e-ecffe6e-1715`. Close unmerged.

## Problem Statement

One tiny deterministic change proves the sandbox -> PR -> verify path.

## Implementation Steps

1. Append exactly one line to `README.md`: `<!-- hula-e2e e2e-ecffe6e-1715 e2e-ecffe6e-c17 [e2e-case 4] -->`
2. Change nothing else. Do not edit this plan file.

## Acceptance Criteria

- [ ] **AC1**: `README.md` ends with the marker line.
- [ ] **AC2**: No other file changes.
- [ ] **AC3**: The marker line carries the case tag.

## End-to-End Test Cases

```json
{"version":1,"cases":[
 {"index":1,"item":"Case A: README ends with the marker line","driver":"cli","expected":"README.md exists","needsRealClaude":false,"criterion":"AC1"},
 {"index":2,"item":"Case C: marker visible on GitHub","driver":"not-testable","expected":"raw README on the branch contains the marker","needsRealClaude":false,"criterion":"AC1"},
 {"index":3,"item":"Case D: browser shows README","driver":"browser","expected":"GitHub page renders the README","needsRealClaude":false,"criterion":"AC1","struck":true,"reason":"no UI in scope"},
 {"index":4,"item":"Case E: marker carries the case tag","driver":"cli","expected":"marker line contains [e2e-case 4]","needsRealClaude":false,"criterion":"AC3"},
 {"index":5,"item":"Case F: PR title names the run","driver":"api","expected":"PR title contains the tracking name","needsRealClaude":false,"criterion":"AC2"}
]}
```
