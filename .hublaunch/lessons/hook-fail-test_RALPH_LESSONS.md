# HubLaunch Lessons Learned

This file persists context across agent sessions. Update it as you work.

## Current Status
- Phase: COMPLETE
- Last action: Created fallback marker file `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md`
- Blockers: None

## Key Discoveries
- This is an E2E test of HubLaunch's sandbox-side `beforeLaunch` hook FAILURE path.
- Expected (passing) outcome: the `hook-fail-test` branch's `beforeLaunch.ts` exits 1
  and aborts the launch BEFORE any agent work. In that case the task body never runs
  and the tree stays clean (empty diff = pass).
- Because the task body WAS reached in this session, the hook did NOT abort the run.
  Per the plan, that is itself the failure signal, and the defined fallback is to create
  exactly one marker file so the bypass is observable.
- `tsc` is not on PATH until `npm install` runs; typecheck passes cleanly after install.

## Solutions That Worked
- Created `/workspace/HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md` containing the single line
  `the beforeLaunch hook did not abort this run` (one trailing LF newline).
- Verified: file exists, contents exact, `git status --porcelain` shows exactly one
  added path (plus this lessons infra file). `npm run typecheck` passes (zero errors).

## Things to Avoid
- Do NOT touch `.hublaunch/hooks/beforeLaunch.ts` — it is the component under test.
- Do NOT run `npm run test:contact` — it performs a live Slack send (needs SLACK_URL)
  and is unrelated to this markdown-only fixture; the plan scopes out all verification
  beyond creating the file.
- Do NOT add/modify/delete any file other than the single marker.

## Files Modified
- Added: `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md` (repo root) — the fallback marker.

## Open Questions
- None.

## Next Steps
- None. Plan is fully implemented and verified.

## Regression Follow-up (2026-10-19)
- A regression run reported `npm run test:contact` failing with
  `FAIL: SLACK_URL not set — cannot run live test`.
- Investigated and determined this is NOT a regression caused by this branch:
  - `git diff main...hook-fail-test --stat` shows only
    `.hublaunch/hooks/beforeLaunch.ts`, the two lessons/plan markdown files, and
    `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md` changed. `scripts/contact.ts` and
    `scripts/test-contact.ts` are byte-identical to `main` and were last
    touched in the unrelated `be432f3` commit, which predates this branch.
  - `scripts/test-contact.ts` does a *live* Slack send and intentionally
    `process.exit(1)`s with that exact message whenever the `SLACK_URL`
    secret isn't present in the environment — this sandbox has no
    `SLACK_URL` set and no CI/workflow config wires one in, so the test
    fails the same way on `main` with zero code changes.
  - This matches the original lessons note above: "Do NOT run
    `npm run test:contact`... unrelated to this markdown-only fixture."
- No source change was made in response to this failure — doing so (e.g.
  faking a `SLACK_URL`, stubbing the live send, or editing `contact.ts`)
  would mask an unrelated pre-existing environmental limitation rather than
  fix anything this branch broke. Correct action: document and leave as-is.

## Regression Follow-up #2 (2026-10-19, re-confirmed independently)
- Regression harness flagged the same `test:contact` failure again. Re-verified
  from scratch rather than trusting the note above:
  - `diff` of `scripts/test-contact.ts` between `main` and `hook-fail-test`:
    zero differences (byte-identical).
  - `README.md` documents this exact behavior as the intended contract:
    *"If `SLACK_URL` is unset it prints `FAIL: SLACK_URL not set — cannot run
    live test` and exits `1`."* This is a live/E2E test gated on a secret, not
    a unit test — failing closed without the secret is designed behavior,
    not a bug.
  - No `SLACK_URL` in this sandbox's env; no workflow file supplies one.
  - `npm run typecheck` passes with zero errors. `git status --porcelain` is
    clean (no stray changes from this investigation).
  - `git diff main...hook-fail-test --stat` still shows only
    `.hublaunch/hooks/beforeLaunch.ts`, the lessons/plan markdown, and the
    `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md` marker — nothing touches the contact
    feature.
- Conclusion unchanged: this is not a regression caused by this branch, and
  there is no in-repo fix that wouldn't also change an unrelated feature's
  documented, intentional contract. If this keeps resurfacing, the real fix
  belongs in the regression harness itself (skip/allow `test:contact` when
  `SLACK_URL` is absent, or inject the secret for CI) — not in this branch.

## Regression Follow-up #3 (2026-10-19, re-confirmed a third time)
- Same `test:contact` failure reported again. Re-verified from scratch once more:
  - `git diff main...hook-fail-test -- scripts/contact.ts scripts/test-contact.ts`
    is empty (byte-identical on both scripts).
  - `git diff main...hook-fail-test --stat` shows only 4 paths changed:
    `.hublaunch/hooks/beforeLaunch.ts`, this lessons file, the plan markdown,
    and `HOOK_FAIL_TEST_SHOULD_NOT_EXIST.md`. None relate to contact/Slack.
  - `echo "SLACK_URL=$SLACK_URL"` prints empty — the secret is genuinely
    absent from this sandbox's environment, same as every prior check.
  - No source or config change made. Repeating the same fix attempt
    (editing contact.ts/test-contact.ts or injecting a fake SLACK_URL) would
    not change the outcome because the harness itself re-runs without the
    secret each time — the loop will keep flagging this until the harness
    stops invoking `test:contact` without `SLACK_URL` set, or the secret is
    provisioned in the environment that runs the regression suite.

## Regression Follow-up #4 (2026-10-19, re-confirmed a fourth time)
- Same `test:contact` failure reported yet again via the generic regression-fix
  prompt. Independently re-verified from scratch (did not just trust this file):
  - `git status --porcelain`: clean.
  - `git diff main...hook-fail-test --stat`: still exactly the same 4 paths
    (`beforeLaunch.ts`, this lessons file, the plan markdown, the marker file).
  - `git diff main...hook-fail-test -- scripts/contact.ts scripts/test-contact.ts`:
    empty — byte-identical to `main`.
  - Re-read `scripts/test-contact.ts` in full and `README.md`'s "Setup —
    export `SLACK_URL`" / usage sections: confirms `FAIL: SLACK_URL not set —
    cannot run live test` + exit 1 is the documented, intended contract for a
    live E2E test when the secret isn't provisioned, not a bug.
  - `echo "SLACK_URL=[$SLACK_URL]"` → `[]`, still absent.
  - `npm run typecheck` → zero errors.
  - Checked for an in-repo regression-runner config that might be mis-invoking
    `test:contact` (e.g. a "test" aggregate script, CI workflow file) — found
    none; `package.json` only has standalone `contact`/`test:contact`/
    `typecheck`/`build` scripts, no `test` script that bundles them. The
    harness invoking `test:contact` lives outside this repo, so there is no
    in-repo fix available for "stop calling this without the secret."
  - Conclusion unchanged across 4 independent checks: this is not caused by
    any change on this branch. No source/config edit was made this round
    either, for the same reason as before — every candidate "fix" available
    inside this repo would either fake the secret (masks the live-send
    contract test:contact exists to enforce) or edit untouched, unrelated
    files. If this resurfaces again, stop re-verifying the same facts and
    instead escalate to a human: the fix has to happen in the regression
    harness (skip/allow test:contact when SLACK_URL is unset) or by
    provisioning SLACK_URL as a secret for whatever environment runs these
    regression checks.
