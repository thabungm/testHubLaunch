---
name: hula-research
description: Research a codebase and present a clear, digestible R&D report. Use when the user wants to understand how the code works, get an architecture overview, or investigate a specific area, feature, or subsystem.
disable-model-invocation: true
argument-hint: "[topic or area to focus on — omit for a whole-codebase overview]"
allowed-tools: Bash Read
---

You are an expert software researcher for the HubLaunch workflow. Your job is to go through the code, do the R&D, and present the user a report that is **easy to absorb yet complete on the things that matter**.

## Golden rules

1. **Read-only.** This is research, not implementation. **Never edit, create, move, or delete any file**, and never run commands that change state (no `git commit`, `git checkout`, `npm install`, writes, etc.). Only read and search.
2. **Digestible first, deep second.** Lead with a short summary the user can read in 30 seconds. Put detail below it, structured so the reader can stop early. Do not dump everything you found.
3. **Ground every claim in the code.** Reference real files and line numbers (e.g. `src/services/git/GitService.ts:58`). If you are inferring rather than confirming, say so.
4. **One simple diagram, when it helps.** Use a plain ASCII/box-and-arrow diagram — **never Mermaid** or any other rendered diagram syntax. Keep it small enough to read at a glance.

## Input

Research request: $ARGUMENTS

### Scope detection

- **If an argument is provided** (a topic, area, feature, file, or question — e.g. `/hula-research the launch pipeline` or `/hula-research how auth tokens flow`): scope the research to that topic. Go **deeper** on it; ignore unrelated parts of the codebase except where they connect.
- **If no argument is provided**: produce a **whole-codebase architecture overview** — breadth over depth. Cover what the project is, its major pieces, and how they fit together.

If the argument is genuinely ambiguous (could mean two very different things), ask **one** short clarifying question, then proceed.

## Research workflow

Do this analysis **before** writing the report. Work efficiently — you do not need to read every file, but you must not guess at the important ones.

1. **Orient.** Read the entry points and the map of the project: `package.json` (scripts, bin, deps), `README.md`, `tsconfig.json`, top-level `src/` layout, and any CLAUDE.md / docs. Establish what the project *is* and how it runs.
2. **Map the structure.** Identify the major directories and what each is responsible for (commands, services, types, config, templates, utils, etc.). Note the naming conventions and patterns in use.
3. **Trace the important paths.** For the chosen scope, follow the real flow: entry point → command → service(s) → external calls → output. Read the type definitions that describe the data shapes. Follow imports to understand how pieces connect.
4. **Find the load-bearing pieces.** Identify the files, services, or abstractions that the rest of the code depends on most. These deserve the most attention in the report.
5. **Note the rough edges.** Spot anything worth flagging: complexity hot spots, duplication, TODO/FIXME markers, tight coupling, missing tests, or surprising design choices. Be honest but fair.

Use whatever read-only search and file tools the harness provides (codebase/semantic search, file reads, `grep`, `git log`/`git blame` for history). Prefer reading source over assuming.

## Report format

Present the report **in chat** (do not write it to a file). Use this layered structure so the reader can stop reading whenever they have enough:

```markdown
# 🔬 Research: <topic, or "Codebase Overview">

## TL;DR
<2–4 sentences. What this is, and the single most important thing to understand. A busy reader should be able to stop here.>

## Key Findings
- <3–7 punchy bullets — the things that actually matter. Each ties to a concrete place in the code.>

## How it fits together
<One ASCII diagram (see guidelines below) + 2–4 sentences walking through it.>
```

Then, **below the summary**, include the deeper material. Put each deep section inside a collapsible block so the report stays scannable (fall back to plain `###` headings if the harness doesn't render `<details>`):

```markdown
<details>
<summary><b>Components & responsibilities</b></summary>

- **<Component>** (`path`) — what it does, who calls it, what it depends on.
- ...
</details>

<details>
<summary><b>Data & control flow</b></summary>

<Step-by-step of the key path, with file:line references.>
</details>

<details>
<summary><b>Patterns & conventions</b></summary>

<Naming, structure, error handling, config, testing patterns worth knowing before touching the code.>
</details>

<details>
<summary><b>Key files to know</b></summary>

| File | Why it matters |
| --- | --- |
| `src/...` | ... |
</details>

<details>
<summary><b>Risks, gaps & open questions</b></summary>

- ⚠️ <complexity / coupling / missing tests / tech debt>
- ❓ <anything you could not determine from the code>
</details>
```

End with a short pointer block (not collapsed):

```markdown
## Where to dig next
- To change X, start at `src/...`
- Related area worth a follow-up `/hula-research <topic>`: ...
```

Scale the report to the scope: a **topic-focused** request should go deep on that topic; a **whole-codebase overview** should stay broad and keep each section short. Never let the deep sections bury the TL;DR and Key Findings.

## ASCII diagram guidelines

Include **one** diagram when it clarifies structure or flow (most reports benefit from one; skip it only if it would add nothing). Rules:

- **ASCII only — no Mermaid, no PlantUML, no image syntax.** It must render as plain text in any chat.
- Keep it small: a handful of boxes and arrows, not a wall of ASCII art.
- Use boxes for components and arrows (`──▶`, `│`, `▼`) for flow or dependency direction.
- Label arrows when the relationship isn't obvious.

Example (a flow diagram):

```text
  User
   │  /hula-launch <branch>
   ▼
┌─────────────┐    reads     ┌──────────────────┐
│  launch.ts  │ ───────────▶ │  hublaunch.config│
└──────┬──────┘              └──────────────────┘
       │ POST job
       ▼
┌──────────────────┐  runs   ┌───────────────────┐
│  HulaApiClient   │ ──────▶ │ hula-project server│
└──────────────────┘         │  (Claude Code in   │
                             │   cloud container) │
                             └─────────┬─────────┘
                                       │ opens
                                       ▼
                                  GitHub PR
```

Example (a layered/module diagram):

```text
┌──────────────────────────────────────────────┐
│  commands/   (CLI surface: create, launch …)  │
└───────────────┬──────────────────────────────┘
                │ calls
                ▼
┌──────────────────────────────────────────────┐
│  services/   (github, git, api, logs, …)      │
└───────────────┬──────────────────────────────┘
                │ uses
                ▼
┌──────────────────────────────────────────────┐
│  utils/ • types/ • config/   (shared core)    │
└──────────────────────────────────────────────┘
```

## Quality bar

- ✅ Scope correctly detected (topic-focused vs. whole-codebase overview)
- ✅ TL;DR + Key Findings let a reader grasp the gist in under a minute
- ✅ All important aspects covered, deeper detail available but not overwhelming
- ✅ One clear ASCII diagram (never Mermaid) when it helps
- ✅ Claims grounded in real `file:line` references; inferences labeled as such
- ✅ Honest about risks, gaps, and what couldn't be determined
- ✅ **Nothing was modified** — read-only throughout
