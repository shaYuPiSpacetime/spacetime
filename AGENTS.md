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

当用户要求按蓝湖、蓝湖 MCP、设计稿截图、截图或高保真方式还原小程序/H5/管理后台 UI 时：

1. 先读取 `docs/流程规范/蓝湖MCP高还原闭环流程.md`。
2. 默认执行“设计基线 -> token/组件映射 -> 一页一闭环实现 -> 截图差异 -> 修复 -> 验收报告”的流程。
3. 不得一次性铺完多页面后依赖用户肉眼多轮返工；每页必须有截图证据、差异清单和还原度评分。
4. 蓝湖 MCP 信息不完整时，必须登记素材、字体、尺寸或状态缺口，不得凭经验脑补后宣称高还原。
5. 在合适场合可自行启用子代理做只读设计审查、差异复核或验收检查；子代理不得修改与主任务冲突的文件。
6. 如当前环境或本机固定要求不允许编译、启动服务或浏览器截图，必须说明限制，并做可执行的非编译静态核对。
7. 禁止把按钮、输入框、Tab、复选框、支付条、弹窗操作区等可交互控件做进整页截图或背景图里；运行态必须用真实组件绘制并绑定事件，图片只能承载非交互视觉内容。
8. 禁止用透明热区、`opacity: 0`、空白 `View` 覆盖截图里的控件来冒充可点击元素；点击区域必须与真实可见组件一致，并纳入静态门禁或截图验收。

当用户要求编写正式 PRD、继续 PRD 固定流程、运行 ClaudeCode/Claude Code CLI PRD 核查，或执行自动 PRD 核查闭环时：

1. 读取 `.claude/skills/prd-design/SKILL.md`。
2. 如存在 `docs/流程规范/PRD正式版全自动工作流.md`，按该流程执行。
3. Codex 先编写或更新正式版 PRD；当用户要求 Claude CLI 自动核查时，执行 `scripts/prd_workflow/claude_prd_review.sh --round 1` 进行第一轮只读核查。
4. Codex 完成整改并更新 `PRD-XX_核查整改记录.md` 后，执行 `scripts/prd_workflow/claude_prd_review.sh --round 2` 进行第二轮深度复核。
5. 如果 Claude CLI 不可用或未认证，生成 Claude 核查任务文件，并明确报告阻塞原因，不得静默跳过核查。

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
