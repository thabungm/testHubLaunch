# Execute Skill Creation Instructions

These instructions drive the **create-from-description** mode of the
`/hula-execute` skill: turning a plain-language description into a published
action file that `hula execute` can run or schedule.

The action file is plain instruction markdown that the hula-project server reads
from `origin/<uploadBranch>` (default `main`) at run time. It is **not** an Agent
Skill and is never registered as a slash command — it lives under
`.hublaunch/skills/`.

Follow these steps in order. Do **not** skip the question step, and do **not**
run `hula execute` before the file is successfully published.

## Step 1: Ask clarifying questions first (then STOP)

Mirror the `/hula-plan` question-first behavior. Before writing anything, ask the
user the questions you cannot confidently answer from their description:

1. **What should the action do?** The concrete task to perform on each run
   (e.g. "remove unreachable code", "upgrade dependencies and fix breakages").
2. **Target entry point** (optional): the file, directory, or URL the action
   focuses on (e.g. `src/`). Maps to `--entry-point`.
3. **Outcome type**: `pr` (open a pull request), `plan` (produce a plan), or
   `feedback` (review/report only). Maps to `--outcome-type`. Default `pr`.
4. **One-off or scheduled?** If recurring, get the schedule phrase (e.g. "every
   night", "every Monday 9am").
5. **Any constraints / scope limits** the run must respect (optional).

**STOP and wait for the answers.** Do not proceed to authoring until the user
responds. If anything is still ambiguous after the answers, ask a focused
follow-up round.

## Step 2: Confirm the action name

Derive a default slug from the description: lowercase, hyphen-separated, no
spaces or punctuation (e.g. "remove unreachable code in src" →
`remove-unreachable-code`). Propose it to the user and let them override. Confirm
the final name before writing the file.

## Step 3: Resolve the schedule (if recurring)

If the action is scheduled, translate the phrase to a 5-field cron expression
using the preset table in `SKILL.md`, then **echo the cron with a plain-English
readback and confirm it** before publishing/running. There is no server-side
cron validation, so the readback + confirmation is mandatory.

## Step 4: Compute the filename and path

- Filename: `YYYY-MM-DD-HH:MM-<name-slug>.md`
  - Use today's date and the current time on a 24-hour clock.
  - `<name-slug>` is the confirmed, lowercase-hyphenated action name.
- Repo-relative path: `.hublaunch/skills/<filename>`
- Create the `.hublaunch/skills/` directory if it does not exist.

## Step 5: Write the action file (free-form instruction markdown, NO frontmatter)

Use the `Write` tool to create the file at the computed path. The content MUST be
free-form instruction markdown with **no YAML frontmatter** (frontmatter would
make it look like an Agent Skill). Follow this template:

```markdown
# <Action Title>

## Goal
<1–3 sentences describing what this action should accomplish.>

## Steps
1. <step>
2. <step>
3. <step>

## Constraints
- <optional: what must not change / scope limits>

## Outcome
<What the run should produce, consistent with the chosen --outcome-type:
 pr | plan | feedback.>
```

Fill the template from the user's answers. Omit the `## Constraints` section if
the user gave no constraints.

## Step 6: Publish to origin/main BEFORE running (mandatory ordering)

The server clones the repository and reads the action file from the default
branch at run time (and re-reads it on every scheduled fire). The file MUST be on
the branch before the run, so publish it first:

```bash
bash .github/scripts/hula-execute-manage.sh --publish-skill .hublaunch/skills/<filename>
```

Parse the single JSON object it prints:

- If `status` is `"error"`: display `❌ <message>` and **STOP**. Do **not** run
  `hula execute` — the file is not on the branch, so the run would fail.
- If `status` is `"success"`: continue to Step 7.

## Step 7: Run or schedule the action

Only after a successful publish, invoke the run wrapper with `--action-path`
pointing at the committed file:

```bash
bash .github/scripts/hula-execute-run.sh --action-path .hublaunch/skills/<filename> [--entry-point <path>] [--outcome-type <type>] [--schedule "<cron>"]
```

Pass only the flags you resolved. Quote the cron expression.

## Step 8: Report the result

Parse the run wrapper's JSON (same contract as the normal run flow) and report:

- The **created file path** (`.hublaunch/skills/<filename>`) and that it was
  published to `origin/<uploadBranch>`.
- The **run or schedule result**:
  - One-off run → the Run ID and PR link (if any), plus
    `hula execute --show <runId>` to check status.
  - Schedule → the Schedule ID and cron expression, plus a note that you can
    manage it with `/hula-execute list`, `/hula-execute run now <id>`,
    `/hula-execute cancel <id>`, or `/hula-execute update <id> …`.

Example success report:

```
✅ Action created and published

📄 **File**: .hublaunch/skills/2026-06-19-16:35-remove-unreachable-code.md (on origin/main)
🔖 **Schedule ID**: sch_abc123
⏰ **Cron**: 0 3 * * * (every day at 3:00 AM)

Manage it with: /hula-execute list · /hula-execute run now sch_abc123 · /hula-execute cancel sch_abc123
```

## Notes

- Never echo secrets. Credentials resolve inside the CLI.
- The action file is committed to `origin/<uploadBranch>` via a temporary
  worktree — the user's current branch and working tree are never touched.
- If the publish succeeds but the run fails, the file remains on the branch; the
  user can re-run it later with `/hula-execute .hublaunch/skills/<filename>`.
