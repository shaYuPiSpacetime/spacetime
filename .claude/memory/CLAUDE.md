# Project Constitution

## Core directives
1. **Architecture first** — Create/update `.claude/memory/decisions.md` before any implementation. No code without a plan.
2. **Isolated implementation** — Code changes happen in the implementer subagent (forked context). Build logs and test output never pollute the main session.
3. **Mandatory verification** — Nothing is DONE until QA Engineer reports green in `.claude/plans/qa-summary.md`.
4. **Forked execution** — Use `context: fork` for implementer and QA subagents to prevent context rot from noisy output.
5. **Single source of truth** — Plans, decisions, and summaries live in `.claude/plans/` and `.claude/memory/`. The active plan controls what is being worked on.

## Pipeline routing

| Phase | Agent | Artifact |
|---|---|---|
| Triage | Orchestrator | — |
| Design | Architect | `.claude/memory/decisions.md` |
| Execute | Implementer | `.claude/plans/implementation-summary.md` |
| Verify | QA Engineer | `.claude/plans/qa-summary.md` |
| Report | Orchestrator | User-facing summary |

## File index

| File | Purpose |
|---|---|
| `.claude/plans/active-plan.md` | Current task plan with steps and acceptance criteria |
| `.claude/memory/decisions.md` | Architecture Decision Records (ADRs) |
| `.claude/memory/scratchpad.md` | Session log and temporary notes |
| `.claude/plans/implementation-summary.md` | What was implemented and files changed |
| `.claude/plans/qa-summary.md` | Test results and verification status |
| `.claude/skills/git-utils/SKILL.md` | Git workflow skill |
| `.claude/skills/test-suite/SKILL.md` | Test runner skill |
| `.claude/settings.json` | Model config, env vars, permissions |

## Invocation

- **Orchestrator** — Default entry point. User talks to orchestrator.
- **Architect** — `Task(architect "design <feature>")`
- **Implementer** — `Task(implementer "implement plan from active-plan.md")`
- **QA Engineer** — `Task(qa-engineer "verify active-plan.md acceptance criteria")`
- **Git utils** — `/git-utils` or auto-triggered on git tasks
- **Test suite** — `/test-suite` or auto-triggered on test tasks
