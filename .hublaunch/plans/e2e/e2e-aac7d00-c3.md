# [DISPOSABLE E2E TEST] e2e-aac7d00-c3

## Plan Summary

- Disposable end-to-end test launch created by hula-e2e run `e2e-aac7d00-2023`. Close unmerged.

## Problem Statement

HubLaunch needs one tiny, deterministic change to prove the request `mergePolicy` reaches the sandbox on the preview deploy under test.

## Implementation Steps

1. Append one line to `README.md`: `<!-- hula-e2e e2e-aac7d00-2023 e2e-aac7d00-c3 -->`

## Acceptance Criteria

- [ ] `README.md` ends with the marker line `<!-- hula-e2e e2e-aac7d00-2023 e2e-aac7d00-c3 -->`.

## Manual Testing Checklist

1. Run `git log -1 --stat` on the PR branch.
   - Expected result: only `README.md` changed.
