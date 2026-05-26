# Codex Project Instructions

This repository keeps its original Claude Code workflow under `.claude/`. Codex should treat those files as project workflow references and must read the relevant file before doing matching work.

## Required Routing

When the user asks for technical design, architecture design, implementation plan, `tcdesign`, or PRD technical方案:

1. Read `.claude/skills/techni-design/SKILL.md`.
2. Follow its workflow.
3. Write technical design documents under `docs/技术方案/`.

When the user asks to test, run tests, generate test cases, execute testcase, write test report, or verify according to test cases:

1. Read `.claude/skills/code-test/SKILL.md`.
2. Treat `docs/测试文档/*-testcase.md` as the test design source of truth.
3. Execute the applicable L1/L2/L3/L4 tests only when required environment data exists.
4. Always create or update `docs/测试文档/{模块名称}-testreport.md` after test execution.

When the user asks for git branch, commit, merge, PR, stash, or similar git workflow:

1. Read `.claude/skills/git-utils/SKILL.md` if present.
2. Do not run destructive git commands unless explicitly requested.

When the user asks to run a generic test suite or investigate test failures:

1. Read `.claude/skills/test-suite/SKILL.md` if present.
2. Prefer the repository's documented commands.

## Claude Agent Files As References

The files under `.claude/agents/` describe Claude Code subagents. Codex cannot spawn those Claude agents automatically, but should use their instructions as role references when the user asks for that style of work.

| File | Codex usage |
|------|-------------|
| `.claude/agents/orchestrator.md` | Use for Plan -> Execute -> Verify workflow and user-facing summaries. |
| `.claude/agents/architect.md` | Use for architecture and implementation planning. |
| `.claude/agents/implementer.md` | Use for coding according to an active plan. |
| `.claude/agents/qa-engineer.md` | Use for QA review, regression testing, and coverage checks. |

## Project Architecture Rules

Always preserve the Spacetime architecture:

- Backend stack: Java 21 target, Spring Boot 3.4, MyBatis-Plus, MySQL, Redis.
- Backend layering: `Controller -> Service -> ServiceImpl -> DAO -> DAOImpl -> Mapper`.
- `admin/` and `miniapp/` must not import each other. Shared logic belongs in `common/`.
- Controllers return precise `R<T>`.
- Admin APIs use `@RequirePermission` and existing RBAC patterns.
- Business tables include base audit fields and logical delete via `BaseEntity`.
- Frontend stack: React 18, TypeScript, Vite, Tailwind, existing UI components.
- Frontend APIs go in `frontend/src/api/`; routes go in `frontend/src/router/`.

## Testing Rules

- Use the code-test workflow for test tasks.
- For backend verification, prefer:

```bash
cd backend && JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home mvn test
```

- Plain `mvn` may use a newer local JDK and fail Lombok compatibility.
- For frontend verification:

```bash
cd frontend && npm run build
```

- Do not invent API URLs, tokens, role accounts, or test data for L1/L4. If missing, report those tests as skipped in the test report.

## Documentation Outputs

| Task | Output |
|------|--------|
| Technical design | `docs/技术方案/{yyyy-mm-dd}-{功能名称}-tcdesign.md` |
| Test cases | `docs/测试文档/{模块名称}-testcase.md` |
| Test report | `docs/测试文档/{模块名称}-testreport.md` |
| L1 script | `docs/测试文档/{模块名称}-test-l1.sh` |

## Security Note

Do not add or expose secrets. If `.claude/settings*.json` or local config files contain API keys or tokens, do not quote them in responses and recommend rotating/moving them to private environment variables.
