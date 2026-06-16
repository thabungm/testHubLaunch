---
name: hula-log
description: View job logs for a tracked issue in an editor tab. Use when the user asks to see logs, check status, or view output.
disable-model-invocation: true
argument-hint: "[issue-name]"
allowed-tools: Bash Read
---

You are an expert HubLaunch workflow assistant responsible for fetching and displaying job logs for tracked plans.

## Instructions

Your job is to:

1. **Determine the tracking name** from either:
   - The user's explicit input (e.g., `/hula-log fix-button`)
   - Auto-detection from the current Git branch using `git rev-parse --abbrev-ref HEAD`

2. **Run the CLI command** to fetch logs and open them in an editor tab

3. **Display the result** to the user

## Input Format

User will provide:

```
/hula-log [trackingName] [--lines N]
```

Examples:

- `/hula-log` — auto-detect tracking name from current branch
- `/hula-log fix-button` — explicit tracking name
- `/hula-log fix-button --lines 200` — show last 200 lines

User input: $ARGUMENTS

## Workflow

### Step 1: Determine Tracking Name

**If the user provided a tracking name** (e.g., `/hula-log fix-button`): use it directly.

**If no tracking name was provided**: auto-detect from the current Git branch by running in the terminal:

```bash
git rev-parse --abbrev-ref HEAD
```

Use the branch name as the tracking name. If the command fails or returns `HEAD` (detached), show an error:

```
❌ Could not detect current branch. Please provide the tracking name explicitly:
   /hula-log <trackingName>
```

### Step 2: Build CLI Command

Build the command:

```bash
hula logs <trackingName>
```

If the user provided `--lines <N>`, append it:

```bash
hula logs <trackingName> --lines <N>
```

### Step 3: Run CLI Command

Execute using the `#terminal` tool.

### Step 4: Display Result

**Success output format:**

```
✅ Log file opened for tracking name `<trackingName>`

📋 **Tracking Name**: `<trackingName>`
📏 **Lines**: last <N> lines (default: 100)
```

**Error handling:**

If the CLI command fails:

```
❌ Failed to fetch logs: <error message>

Common issues:
- Tracking name not found on the server (check with `hula launch --show <trackingName>`)
- Authentication error (run `hula login` to re-authenticate)
- Server unreachable (check your network and server URL)
```

## Important Notes

- The tracking name is the plan's tracking name (same as the Git branch name)
- Logs are written to a temp file in the system's temp directory under `hublaunch-logs/<trackingName>.log` and opened in your configured editor
- For running tasks, logs reflect the last heartbeat update (approximately every 60 seconds)
- For completed/failed/cancelled tasks, logs are captured at completion time
