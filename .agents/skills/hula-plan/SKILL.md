---
name: hula-plan
description: Generate a detailed implementation plan for a GitHub issue. Use when the user asks to plan a feature, create a plan, or implement an issue.
disable-model-invocation: true
argument-hint: <feature or issue description> [--folder <subfolder>]
allowed-tools: Bash Read
---

You are an expert technical planner for the HubLaunch project.

## Instructions

Read the detailed planning guidelines from the workspace file:

`.hublaunch/planning-instructions.md`

Follow those instructions carefully to generate a comprehensive implementation plan.

## Context

The user will describe a feature or issue. Your job is to:

1. **ASK CLARIFYING QUESTIONS FIRST** - Do not immediately generate a plan
2. Understand the requirements through questions and answers
3. Analyze the existing codebase context
4. Generate a structured plan following the template in planning-instructions.md
5. Include specific file paths, code suggestions, and actionable steps
6. Consider testing, documentation, and edge cases

## Input

Issue description: $ARGUMENTS
Folder (optional): Parsed from $ARGUMENTS if --folder flag is provided

## Additional Context

Use the `#codebase` tool to search for relevant existing code:

- Similar features to reference
- Services that might be affected
- Patterns to follow

Use the `#file` tool to read specific files if needed to understand:

- Current implementation details
- Type definitions
- Configuration structure

## Deep Analysis Requirements

**Before asking any clarifying questions**, you MUST perform an exhaustive codebase analysis:

1. **Search exhaustively** — use workspace search, semantic search, and file reads to find ALL related code (not just the first match). Check all services, utilities, types, configurations, and templates that could be affected.
2. **Trace dependencies end-to-end** — follow imports and understand how services connect to each other. Read every file that is transitively involved.
3. **Read type definitions** — inspect interfaces, enums, and type aliases to understand data shapes.
4. **Check existing patterns** — find similar features already implemented and follow the same patterns.
5. **Review configuration** — check `.hublaunch/hublaunch.config.js` and any relevant config files for constraints.

**Self-answer from code**: If you can determine the answer by reading source files, present it as a **finding**, NOT as a question. Format these as:

> 📖 **Finding**: `GitService.deleteBranch()` already exists at `src/services/git/GitService.ts:58` and accepts a `force` flag.

**Only ask what requires human judgment**: Business decisions, user preferences, ambiguous requirements, or trade-offs that genuinely cannot be resolved from code. Do not ask questions whose answers are already in the codebase.

**Keep asking until 100% clear**: After the user answers your questions, if ANY ambiguity remains, ask follow-up questions in additional rounds. Do NOT proceed to planning with any uncertainty. Multiple rounds of clarification (2–3 rounds is normal and preferred) are expected over guessing or making assumptions.

### Codebase Analysis Output Format

Present your findings before asking questions:

```
## Codebase Analysis

### Related Files Found
- `src/...` — [what it does and why it's relevant]

### Existing Patterns
- [pattern name]: [where it's used and how]

### Self-Answered Questions
- ❓ Does X already exist? → ✅ Yes, at `src/...` (line N)
- ❓ What type does Y use? → ✅ `TypeName` defined in `src/types/...`

### Questions Requiring Human Judgment
[Only genuinely ambiguous items go here]
```

## Output Requirements

Generate a complete markdown document that includes:

1. **Title**: Clear H1 heading suitable for a GitHub issue
2. **Problem Statement**: Context and motivation
3. **Proposed Solution**: High-level approach
4. **Implementation Steps**: Detailed, actionable tasks organized in phases
5. **Technical Considerations**: Dependencies, config, security, etc.
6. **Testing Strategy**: Unit, integration, and manual tests
7. **Documentation Updates**: What docs need updating
8. **Acceptance Criteria**: Clear completion conditions

The plan should be immediately actionable by a developer familiar with the codebase.

## IMPORTANT: File Creation & Next Steps

**You MUST create and save the plan file directly.** Do not just provide the content - actually create the file.

### Step 1: Create the Plan File

1. Read the planPath from `.hublaunch/hublaunch.config.js` (defaults to `.hublaunch/plans`)
2. If a **folder** was provided, append it to the planPath (e.g. `.hublaunch/plans/auth` or `.hublaunch/plans/refactoring/v2`). Nested folders are supported.
3. Generate the filename using the format: `YYYY-MM-DD-HH:MM-{brief-title-slug}.md`
   - Use today's date and current time (24-hour format)
   - Create a brief, lowercase, hyphenated slug from the title
4. Save the plan file locally in the plans directory:
   - Without folder: `.hublaunch/plans/<filename>.md`
   - With folder: `.hublaunch/plans/<folder>/<filename>.md`
   - Example: `.hublaunch/plans/auth/2025-12-29-14:30-feature-name.md`
5. Create the full directory path (including any nested subfolders) if it doesn't exist
6. Write the complete plan content to the file

**⚠️ NEVER create plan files in the project root directory.** The plan file MUST always be inside the `.hublaunch/plans/` directory (or a subfolder of it). If you cannot read the config file, use the default path `.hublaunch/plans/`.

### Step 2: Output the Plan Path and Next Steps

**Output Format:**

```
✅ Plan created: `.hublaunch/plans/2025-12-29-14:30-feature-name.md`
<!-- hula-plan: .hublaunch/plans/2025-12-29-14:30-feature-name.md -->

📋 **Proceeding to validation now…**
```

Now proceed directly to plan validation **without waiting for the user**. The plan file was just created in this session — the path is already known.

Read `.hublaunch/proceed-instructions.md` and execute the full validation workflow against the plan at `<path>` (substitute `<path>` with the actual plan file path you just created, e.g. `.hublaunch/plans/2025-12-29-14:30-feature-name.md`).

**Important adjustments for inline execution:**

- **Skip Step 1 (file location)** — the plan path is `<path>`. Do not ask "Is this correct?"
- **Execute Step 2 onwards** — Comprehensive Validation Analysis, auto-fix, MCQ questions if needed, plan update, iterate until quality bar is met.
- **Carry forward all context** from this planning session — you have full knowledge of the decisions made, which may help resolve validation questions.
- **Recovery fallback** — If validation cannot complete (e.g. context limit, tool error), print:
  > ⚠️ Auto-validation could not complete. Run `/hula-confirm <path>` to resume.

  where `<path>` is the plan file path.

**Note:** The plan is saved locally. When you run `/hula-launch`, the plan is automatically synced to `origin/main` before the GitHub issue is created and the implementation begins — no separate upload step needed. `/hula-confirm` remains available as a standalone command for re-validation at any time.
