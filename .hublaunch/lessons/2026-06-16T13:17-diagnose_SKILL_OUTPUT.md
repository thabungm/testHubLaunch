# diagnose — Skill Output

## Summary

The `diagnose` skill is a disciplined loop for **a specific, reported, reproducible bug or performance regression** (reproduce → minimise → hypothesise → instrument → fix → regression-test). Running it requires two inputs:

1. A concrete symptom — an error, wrong output, crash, or measured slowdown that someone observed.
2. A runnable system the symptom occurs in, so a feedback loop can be built against it.

**Neither input is present in this repository.** After a full investigation (documented below), the honest finding is that there is nothing to diagnose here. I am stopping at Phase 1 as the skill itself instructs ("When you genuinely cannot build a loop: stop and say so explicitly. List what you tried."), rather than fabricating a bug to chase.

---

## Phase 1 — Build a feedback loop

The skill is emphatic that this phase *is* the skill: get a fast, deterministic pass/fail signal for the bug. Before a loop can be built, there must be a bug and a system to run it against. I checked for both.

### What I looked for and found

| Check | Command / location | Result |
|-------|--------------------|--------|
| Bug description in the task | GitHub issue #27 (`thabungm/testHubLaunch`) | Issue body contains **only the verbatim `diagnose` skill text** — no symptom, no stack trace, no repro, no "X is broken" statement. |
| Application source | `find /workspace -type f` (excluding `.git`/`.hublaunch`) | Only `.gitignore`, a 1‑byte empty `test` file, `ralph.md`, `ralph-run.sh`, `skills-lock.json`, and skill `SKILL.md` files. **No `src/`, no app code.** |
| Project manifest | `/workspace/package.json` | **Does not exist.** |
| TypeScript / lint signal | `pnpm tsc --noEmit`, `pnpm check` | Both abort: `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND — No package.json`. There is no build/test signal to run. |
| IVR system (per ralph.md) | `src/dev-tools/ivr-simulator/`, `stateMachine/` | **No such directories.** The IVR verification path in ralph.md does not apply. |
| Tests | any `*.test.*`, jest config | None exist. |
| Other branches / stashes with code | `git branch -a`, `git stash list` | Only `main`; no stash. |
| Git history | `git log --oneline` | Commits add *plans* only ("Add landing page plan", "Add contact page plan", "Add About Us page plan", "skills edit"). No implementation was ever committed. |

### Conclusion of Phase 1

No feedback loop can be constructed because there is **no bug and no executable code path to exercise**. The repository is a HubLaunch scaffold (skills, runner, ralph.md) with no application under it. This is the explicit "cannot build a loop" exit condition in the skill.

## Phases 2–6 — Not applicable

- **Phase 2 (Reproduce):** Nothing to reproduce — no reported symptom exists.
- **Phase 3 (Hypothesise):** Hypotheses must be falsifiable predictions about the cause of an observed failure. With no observed failure, any hypothesis would be invented, which the skill explicitly warns against ("If you cannot state the prediction, the hypothesis is a vibe — discard it").
- **Phase 4 (Instrument):** No code path to instrument.
- **Phase 5 (Fix + regression test):** No defect to fix; no seam to test.
- **Phase 6 (Cleanup + post-mortem):** No instrumentation or prototypes were introduced, so nothing to clean up.

## Verification (per ralph.md requirements)

The mandatory pre-completion checks were attempted and faithfully reported:

- `pnpm tsc --noEmit` → cannot run (no `package.json`).
- `pnpm check` → cannot run (no `package.json`).
- IVR simulator paths → not applicable (no IVR system in this repo).

These commands target a project (a Next.js/IVR app) that is not present in `testHubLaunch`. There were **no code changes made**, so there is nothing for these gates to validate. No regression risk was introduced.

## What would let this skill run

To actually exercise `diagnose`, provide:

1. **A concrete bug report** — the observed wrong behaviour, the input that triggers it, and the expected vs actual result; and
2. **The codebase it occurs in** — a runnable project (with `package.json`/tests/dev server) so a deterministic pass/fail feedback loop can be built.

Given those, the loop would run as designed: build the sharpest reproducible signal first, then bisect/hypothesise/instrument against it.

## Outcome

No diagnosable defect exists in this repository at this time. Reported honestly per the skill's own guidance; **no bug was fabricated and no speculative code was changed.**
