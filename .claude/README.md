# Spacetime

<!-- 项目描述 -->

---

## .claude 目录结构说明

本项目使用 Claude Code 的 `.claude` 目录来配置多智能体开发管线（Pipeline），实现 **Plan → Execute → Verify** 的自动化工作流。以下为完整目录结构和各文件作用。

```
.claude/
├── agents/                          # 智能体定义（YAML 前置元数据 + 系统提示词）
│   ├── orchestrator.md              # 编排者 — 用户入口，负责任务分诊、分发和结果汇总
│   ├── architect.md                 # 架构师 — 设计方案、接口契约、数据模型，产出 ADR
│   ├── implementer.md               # 实现者 — 按架构计划编写代码和单元测试（fork 上下文）
│   └── qa-engineer.md              # QA 工程师 — 运行回归测试、审查代码缺陷（fork 上下文）
│
├── skills/                          # 技能定义（可复用能力，支持斜杠命令和自动触发）
│   ├── git-utils/
│   │   └── SKILL.md                 # Git 工作流技能 — 创建分支、提交、推送 PR
│   └── test-suite/
│       └── SKILL.md                 # 测试套件技能 — 运行测试、按文件筛选、覆盖率报告
│
├── hooks/                           # 生命周期钩子脚本（Shell，在特定事件触发）
│   ├── on-session-start.sh          # SessionStart — 会话启动/恢复时记录时间戳
│   └── log-agent-activity.sh        # PostToolUse — 工具调用后记录活动到 scratchpad
│
├── plans/                           # 计划与记录（管线各阶段的产出物）
│   ├── active-plan.md               # 当前任务计划 — 包含目标、步骤、验收标准
│   ├── implementation-summary.md    # 实现记录 — 文件变更、偏离计划说明
│   ├── qa-summary.md                # QA 总结 — 测试结果、缺陷列表、通过/失败判定
│   └── archive/                     # 历史计划归档
│
├── memory/                          # 持久化记忆与上下文
│   ├── CLAUDE.md                    # 项目宪法 — 核心规则、管线路由、文件索引（Claude 自动读取）
│   ├── decisions.md                 # 架构决策记录（ADR）— 记录设计方案和权衡
│   └── scratchpad.md                # 暂存区 — 会话日志、临时笔记、活动追踪
│
└── settings.json                    # Claude Code 配置文件 — 模型选择、环境变量、权限
```

---

## 各文件详细说明

### Agents（智能体）

定义在 `.claude/agents/*.md`，每个文件使用 YAML 前置元数据声明名称、描述、模型、可用工具等属性。管道流程：

```
用户请求 → Orchestrator → Architect (设计)
                         → Implementer (编码)  [fork 上下文]
                         → QA Engineer (验证)  [fork 上下文]
                         → Orchestrator (汇总报告)
```

| 文件 | YAML 元数据 | 职责 |
|------|------------|------|
| `orchestrator.md` | `model: inherit`, `allowed-tools: Read Task` | 接收用户请求，判断任务类型，分发给对应子智能体。不写代码，不运行测试 |
| `architect.md` | `model: sonnet`, `allowed-tools: Read Grep Glob Write` | 阅读代码库，设计方案，写入 ADR 到 `decisions.md`，更新 active-plan |
| `implementer.md` | `model: sonnet`, `allowed-tools: Read Grep Glob Write Edit Bash`, `context: fork` | 在隔离上下文中编码和测试，避免构建日志污染主会话 |
| `qa-engineer.md` | `model: haiku`, `allowed-tools: Read Grep Glob Bash`, `context: fork` | 运行测试、审查代码、检查覆盖率，报告通过/失败 |

### Skills（技能）

`.claude/skills/<name>/SKILL.md` 定义了可复用能力。支持：
- **用户调用** — `/git-utils`、`/test-suite`
- **Claude 自动触发** — 当匹配到相关任务时

| 技能 | `context: fork` | 用途 |
|------|----------------|------|
| `git-utils` | 是 | 分支管理、提交、推送 PR |
| `test-suite` | 是 | 运行测试套件、按文件筛选、覆盖率 |

### Hooks（钩子）

Shell 脚本在 Claude Code 生命周期事件中触发。需在 `settings.json` 中注册。

| 脚本 | Hook 事件 | 作用 |
|------|----------|------|
| `on-session-start.sh` | `SessionStart` | 会话启动时记录时间戳和项目信息到 scratchpad |
| `log-agent-activity.sh` | `PostToolUse` (matcher: `Task*`) | 每次工具调用后将摘要写入 scratchpad |

### Plans（计划）

计划文件是管线各阶段的契约和产出物：

| 文件 | 写入者 | 读取者 | 内容 |
|------|--------|--------|------|
| `active-plan.md` | Architect | Implementer, QA | 目标、步骤列表（checkbox）、验收标准、状态 |
| `implementation-summary.md` | Implementer | Orchestrator | 变更文件列表、偏离计划说明 |
| `qa-summary.md` | QA Engineer | Orchestrator | 测试结果统计、缺陷列表、PASS/FAIL 判定 |

### Memory（记忆）

| 文件 | 用途 |
|------|------|
| `CLAUDE.md` | **项目宪法** — Claude Code 自动读取，包含核心规则和文件索引。作为路由表将上下文分散到各专用文件 |
| `decisions.md` | **架构决策记录** — 不可变的 ADR 条目，记录"为什么这么设计" |
| `scratchpad.md` | **暂存区** — 会话日志、中间笔记、活动追踪。定期清理 |

---

## 关键最佳实践

1. **Architecture first** — 实现前必须先更新 `decisions.md`，没有计划不写代码
2. **Forked context** — Implementer 和 QA Engineer 使用 `context: fork` 在隔离上下文中运行，防止 "context rot"
3. **Mandatory verification** — 直到 QA 报告 green，任务才算完成
4. **CLAUDE.md as router** — `CLAUDE.md` 保持精简作为路由表，详细上下文分散到各专用文件
5. **Skills over Subagents** — 使用 Skills 配合 `context: fork` 作为轻量化子智能体方案

---

## 快速开始

```bash
# 管线调用示例
Task(orchestrator "实现用户登录功能")

# 技能调用
/git-utils create-branch feature/login
/test-suite run-all
```
