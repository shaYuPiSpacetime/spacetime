# Project Constitution

## Core directives
1. **Architecture first** — Create/update `.claude/memory/decisions.md` before any implementation. No code without a plan.
2. **Isolated implementation** — Code changes happen in the implementer subagent (forked context). Build logs and test output never pollute the main session.
3. **Mandatory verification** — Nothing is DONE until QA Engineer reports green in `.claude/plans/qa-summary.md`.
4. **Forked execution** — Use `context: fork` for implementer and QA subagents to prevent context rot from noisy output.
5. **Single source of truth** — Plans, decisions, and summaries live in `.claude/plans/` and `.claude/memory/`. The active plan controls what is being worked on.

## Pipeline routing

## 发布长期规则（用户确认于 2026-10-09）

- 每次发布都先实际拉取并同步最新 `origin/master`，包括仅重新发布、重新上传小程序体验版的请求；上次已经拉取不能替代本次拉取。
- 小程序必须从同步后的当前源码构建，上传前再核对远端提交；发布过程中有新代码，先同步并重新构建后上传，不能发布旧包。
- 保留用户未提交内容，仅在 `master` 上提交本次任务文件。拉取失败、冲突或发布权限不足时停止并说明阻碍，不强行覆盖。
- 发布阶段不重复全量测试；执行必要的构建与产物检查，核对真实上传回执并记录版本和源提交。后端和管理端部署另行核对。

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
