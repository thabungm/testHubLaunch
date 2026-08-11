---
name: hula-launch
description: "Launch a validated plan: creates the GitHub issue and starts the cloud run that ends in a verified PR (offered automatically after /hula-plan). Use when the user asks to launch a plan."
disable-model-invocation: true
argument-hint: <branch-name> [<plan-path>] [--handoff <username>] [--test] [--skip-regression] [--kill] [--kill-and-relaunch]
allowed-tools: Bash Read
---

You are an expert HubLaunch workflow assistant. Your job is to extract two values from the user input and chat history, then run a single script.

## Step 1: Extract branch name and plan path

From `$ARGUMENTS`:
- **Branch name** (required): the first word (e.g., `feature-auth`).
- **Plan path** (optional): the second word, if present (e.g., `.hublaunch/plans/2026-06-10-14:00-feature-auth.md`).
- **--handoff** (optional): a `--handoff <username>` flag anywhere in `$ARGUMENTS`.
- **--test** (optional): the bare flag `--test`, anywhere in `$ARGUMENTS`. Sets test mode (server uses a mock Claude — fast E2E run; a real PR is still created).
- **--skip-regression** (optional): the bare flag `--skip-regression`, anywhere in `$ARGUMENTS`. Force-skips the regression-tests pipeline step for this one launch (overrides any `steps.regression.skip` config default).
- **--kill** (optional): the bare flag `--kill`, anywhere in `$ARGUMENTS`. Stops the in-flight task for this branch name **without** relaunching. A plan path is **not** required with `--kill` — the branch name alone is enough.
- **--kill-and-relaunch** (optional): the bare flag `--kill-and-relaunch`, anywhere in `$ARGUMENTS`. Cancels the in-flight task, resets stale state, and launches a fresh task (needs a plan path, like a normal launch).

`--kill` and `--kill-and-relaunch` are mutually exclusive; if the user passes both, stop with:
```
❌ --kill and --kill-and-relaunch cannot be used together.
```

If no branch name is provided, stop with:
```
❌ Branch name required. Usage: /hula-launch <branch-name> [<plan-path>] [--handoff <username>] [--test] [--kill] [--kill-and-relaunch]
```

**Plan path resolution** (skip entirely when `--kill` is set — a bare kill needs only the branch name):

If no plan path was given in `$ARGUMENTS`, look in the current chat history for the HTML comment:
```
<!-- hula-plan: <path> -->
```
Use the path from the most recent such comment.

If no plan path is found in `$ARGUMENTS` or chat history (and `--kill` is not set), stop with:
```
❌ No plan found in this chat. Run /hula-plan first, or pass the plan path as the second argument.
```

## Step 2: Run the launch script

With the values known, run exactly one Bash command.

Without handoff:
```bash
hula script launch-run -- <plan-path> <branch-name>
```

With handoff:
```bash
hula script launch-run -- <plan-path> <branch-name> --handoff <username>
```

With test mode:
```bash
hula script launch-run -- <plan-path> <branch-name> --test
```

With handoff + test mode:
```bash
hula script launch-run -- <plan-path> <branch-name> --handoff <username> --test
```

With skip-regression:
```bash
hula script launch-run -- <plan-path> <branch-name> --skip-regression
```

Append `--test` whenever the user passed it; it composes with `--handoff`. Append `--skip-regression` whenever the user passed it; it composes with `--handoff` and `--test` too.

**Stop the in-flight task without relaunching (`--kill`)** — pass only the branch name (no plan path):
```bash
hula script launch-run -- <branch-name> --kill
```

**Kill the in-flight task and relaunch fresh (`--kill-and-relaunch`)** — needs a plan path, like a normal launch, and composes with `--handoff`/`--test`:
```bash
hula script launch-run -- <plan-path> <branch-name> --kill-and-relaunch
```

## Step 3: Show the result

Parse the JSON output from the script:
- If `status` is `"error"`, display `❌ Launch failed: <message>` and stop.
- If `status` is `"success"` **and this was a `--kill` (cancel-only) run** — indicated by an empty `issueNumber` — there is no new issue/PR. Display a cancel summary instead of the launch template:

```
🛑 Kill request sent for branch `<branchName>`

<cliOutput>
```

The `cliOutput` already says whether a task was cancelled (`Cancelled '<branch>'`) or there was nothing to cancel (`No active task to cancel for '<branch>'`). Do **not** emit a `hula-issue` comment for a pure kill.

- Otherwise (`status` is `"success"` with a non-empty `issueNumber` — a normal launch or `--kill-and-relaunch`), display:

```
✅ Launched issue #<issueNumber> on branch `<branchName>`

📋 **Issue**: <repo>#<issueNumber>
🌿 **Branch**: `<branchName>`
📄 **Plan**: `<planPath>`

<!-- hula-issue: <issueNumber> -->

**Next Steps:**
- Use `/hula-fix <problem>` to make corrections
- Use `/hula-verify` to check implementation against the plan
- Use `/hula-approve` when ready to merge
```

## Important Notes

- Do NOT call the `Read` tool to check if the plan file exists. The `hula launch` CLI validates file existence (locally and on `origin/main`) and reports errors clearly.
- Do NOT run `hula upload` separately. `hula launch` handles upload automatically.
- This command is typically run after `/hula-plan` and `/hula-confirm`.
