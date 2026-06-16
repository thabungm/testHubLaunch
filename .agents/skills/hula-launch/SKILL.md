---
name: hula-launch
description: Launch a GitHub issue from the current plan. Use when the user asks to launch or assign the plan to a remote agent.
disable-model-invocation: true
argument-hint: <branch-name> [<plan-path>]
allowed-tools: Bash Read
---

You are an expert HubLaunch workflow assistant. Your job is to extract two values from the user input and chat history, then run a single script.

## Step 1: Extract branch name and plan path

From `$ARGUMENTS`:
- **Branch name** (required): the first word (e.g., `feature-auth`).
- **Plan path** (optional): the second word, if present (e.g., `.hublaunch/plans/2026-06-10-14:00-feature-auth.md`).
- **--handoff** (optional): a `--handoff <username>` flag anywhere in `$ARGUMENTS`.

If no branch name is provided, stop with:
```
❌ Branch name required. Usage: /hula-launch <branch-name> [<plan-path>] [--handoff <username>]
```

If no plan path was given in `$ARGUMENTS`, look in the current chat history for the HTML comment:
```
<!-- hula-plan: <path> -->
```
Use the path from the most recent such comment.

If no plan path is found in `$ARGUMENTS` or chat history, stop with:
```
❌ No plan found in this chat. Run /hula-plan first, or pass the plan path as the second argument.
```

## Step 2: Run the launch script

With both values known, run exactly one Bash command:

Without handoff:
```bash
bash .github/scripts/hula-launch-run.sh <plan-path> <branch-name>
```

With handoff:
```bash
bash .github/scripts/hula-launch-run.sh <plan-path> <branch-name> --handoff <username>
```

## Step 3: Show the result

Parse the JSON output from the script:
- If `status` is `"error"`, display `❌ Launch failed: <message>` and stop.
- If `status` is `"success"`, display:

```
✅ Launched issue #<issueNumber> on branch `<branchName>`

📋 **Issue**: <repo>#<issueNumber>
🌿 **Branch**: `<branchName>`
📄 **Plan**: `<planPath>`

<!-- hula-issue: <issueNumber> -->

**Next Steps:**
- Use `/hula-fix <problem>` to make corrections
- Use `/hula-verify` to check implementation against the plan
- Use `/hula-merge` when ready to merge
```

## Important Notes

- Do NOT call the `Read` tool to check if the plan file exists. The script validates file existence and reports errors clearly.
- Do NOT run `hula upload` separately. `hula launch` handles upload automatically.
- This command is typically run after `/hula-plan` and `/hula-confirm`.
