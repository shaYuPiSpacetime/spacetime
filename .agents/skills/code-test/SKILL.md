---
name: code-test
description: >-
  变更代码测试：基于 git diff 或用户指定的代码变更，先生成测试用例文档，
  再派生 cURL/MockMvc/JUnit/Playwright 测试脚本，执行后输出独立测试报告。
  通过复杂度评估自动决策 L1-L4 测试组合；无技术方案时自动降级为轻量模式。
  触发场景：用户说"生成测试/测试用例/帮我测试/写个测试/测试计划/test"。
  本 skill 按需加载，不常驻上下文。
---

# 变更代码测试（Code Test）

> **核心原则：testcase.md 是测试设计的唯一源头，testreport.md 是测试执行的唯一记录。**
>
> ```
> 技术方案/代码变更 → testcase.md（测试设计）→ 派生脚本 → 执行 → testreport.md（测试报告）
> ```

### ⛔ 核心约束：不确定就停下来问

- **环境地址**：优先从 `frontend/e2e-tests/.env` 读取（`BASE_URL` / `API_URL`），未配置时**必须询问用户**，**禁止猜测或编造地址**
- **测试数据**：不确定测试数据 ID 或前置条件时，**必须询问用户**，不得编造假数据执行
- **Token**：不得使用过期或占位 Token 直接执行，缺失时**必须提示用户提供**
- **测试范围**：不确定用户需要哪些层级（L1-L4）时，**列出建议让用户确认**
- **任何歧义**：宁可多问一句，不可猜错一次

## 四层测试体系

| 层级 | 技术 | 测什么 | 来源 |
|------|------|-------|------|
| **L1** | cURL 脚本 | 接口能通、参数对、权限拦截 | tcdesign §4 / 代码接口 |
| **L2** | MockMvc | 路由绑定、注解生效 | tcdesign §4 + 代码 |
| **L3** | JUnit + Mockito | 纯业务逻辑正确性 | tcdesign 状态矩阵 / 代码分支 |
| **L4** | Playwright | UI 显隐、交互流程、多角色 | tcdesign §6 / 前端代码 |

## 触发方式

| 方式 | 说明 |
|------|------|
| **手动** | 用户说"帮我生成测试/测试用例/写个测试/test" |
| **Coding 完成后** | 主动建议："是否需要生成测试计划？" |
| **配合 superpowers:requesting-code-review** | Code Review 完成后，将 Critical/Warning 转化为补充用例 |

---

## 执行流程

### Step 0：识别测试模式与目标项目

**产出物目录**：所有测试文档统一放在 `<项目根>/docs/测试文档/`，文件名为测试模块名称（如 `用户管理-testcase.md`）。

**判断测试模式**：

| 条件 | 模式 | 后续流程 |
|------|------|---------|
| 用户明确说明测试目标和场景 | **完整模式** | Step 1 → Step 8 全流程 |
| 只有代码变更（git diff / 用户指定文件） | **轻量模式** | 跳过 Step 1 评估，默认 L1，按需追加 L2-L4 |
| 已有 testcase.md 且需求迭代追加 | **增量模式** | 读取已有 testcase.md → 追加新用例（保留已有 ID 和结果） |

**识别目标项目**（后端）：

| 变更路径 | 后端子项目 | 测试目录 | mvn 命令 |
|---------|-----------|---------|---------|
| `backend/src/main/java/...` | backend | `backend/src/test/java/` | `cd backend && mvn test` |

**识别目标项目**（前端）：

| 前端项目 | UI 框架 | E2E 支持 | 选择器风格 |
|---------|---------|---------|-----------|
| frontend | React 18 + Tailwind CSS + shadcn/ui | ✅ | Tailwind class + shadcn/ui 组件 data 属性 |

### Step 1：提取测试依据

**必读**：[001-testcase-spec.mdc](references/001-testcase-spec.mdc)（§三「从代码变更提取用例」）

**完整模式**（用户指定测试目标）：

| 提取内容 | 来源 | 用于 |
|---------|------|------|
| 接口定义（路径/入参/出参） | Controller 代码 | L1/L2 用例 |
| 交互流程（正常流+异常流） | 页面组件代码 | L4 + 手动用例 |
| 状态流转矩阵 | Service 代码分支 | L3 用例 |
| 权限配置 | `@RequirePermission` 注解 | 权限测试用例 |
| 前端变更清单 | `git diff` 前端文件 | L4 触发判断 |

**轻量模式**（无明确测试目标，仅代码变更）：

| 提取内容 | 来源 | 用于 |
|---------|------|------|
| 变更的 Controller 接口 | `git diff` / 代码文件 | L1 用例 |
| 变更的 Service 方法 | `git diff` / 代码文件 | L3 用例（按需） |
| 变更的前端页面 | `git diff` / 代码文件 | 手动 / L4 用例 |

### Step 2：测试策略自动决策

**参照**：[001-testcase-spec.mdc](references/001-testcase-spec.mdc)（§二「策略决策」）

两组独立评估：

**后端**（6 维度打分 → 总分决定 L1/L2/L3）：

| 总分 | 后端组合 |
|------|---------|
| 0-2 | L1 |
| 3-5 | L1 + L2 |
| 6+ | L1 + L2 + L3 |

**前端**（4 条件命中判断 → 决定是否追加 L4）：

| 条件 | 命中 → L4 |
|------|----------|
| 多角色权限差异 | ✅ |
| 复杂交互流程（弹窗嵌套/状态联动） | ✅ |
| 多页面联动 | ✅ |
| 核心业务页面 | ✅ |

> 用户可手动覆盖："只要 L1" / "全部都要" / "不要 Playwright"
>
> **轻量模式**：跳过评分，默认 L1，用户可手动追加。

### Step 3：生成 testcase.md（测试设计源头）

**必读**：[001-testcase-spec.mdc](references/001-testcase-spec.mdc)（策略决策 + 用例分类 + 文档模板）

按策略决策结果，按需追加读取：

| 策略命中 | 追加读取 |
|---------|---------|
| L1/L2/L3（后端） | [002-backend-test-templates.mdc](references/002-backend-test-templates.mdc) |
| +L4（前端 E2E） | [003-playwright-e2e-template.mdc](references/003-playwright-e2e-template.mdc) |

**增量模式**：读取已有 testcase.md → 保留已有用例和 ID → 新增用例分配新 ID → 追加到对应章节。

输出：`docs/测试文档/{模块名称}-testcase.md`

> ⚠️ 此步骤**不需要**环境地址和 Token——文档描述的是"测什么"，不是"怎么跑"。

### Step 4：从 testcase.md 派生可执行脚本

**生成前检查**（L2/L3）：检查目标项目的测试框架版本（Spacetime 后端统一 JUnit 5）。

根据 testcase.md 中各章节的用例，生成对应的可执行脚本：

| testcase.md 章节 | 派生物 | 输出位置 |
|-----------------|-------|---------|
| L1 接口测试 | **独立 `.sh` 批量执行脚本** | `docs/测试文档/{模块名称}-test-l1.sh` |
| 前端手动测试 | 用例表格 | 内嵌在 testcase.md |
| L2 Controller 测试 | `XxxControllerTest.java` | `backend/src/test/java/com/spacetime/` |
| L3 Service 测试 | `XxxServiceTest.java` | `backend/src/test/java/com/spacetime/` |
| L4 E2E 测试 | `{模块名}.spec.ts` | `frontend/e2e-tests/` |

**L1 脚本生成流程**（详见 [002-backend-test-templates.mdc](references/002-backend-test-templates.mdc)「Pre-Analysis」）：

1. **Pre-Analysis**（必做）：业务链反推 → 链上接口与 DTO → 被测分支与错误文案 → 状态与验证查询 → 数据计划（**优先接口自构建**，不行再列表自发现）
2. **链式**：准备阶段产出的 ID 传给被测接口；写后 `sleep` 再查验证
3. **分区**：环境 → 数据准备 → 无 Token/缺参/无效 ID → 只读 → 写入 → 外部 API（可 skip）

> **❌ 禁止**：不分析代码就写 L1；字段名/分页/嵌套路径禁止猜测。

### Step 5：确认环境信息（执行前才问）

仅在用户准备执行测试时询问（缺什么问什么）：

**5.1 自动获取环境地址**（优先级：`.env` > 询问用户）：

`frontend/e2e-tests/.env` 中配置地址变量：

| 变量 | 用途 | 对应测试层级 |
|------|------|------------|
| `BASE_URL` | 前端页面地址 | L4 Playwright |
| `API_URL` | 后端接口地址 | L1 cURL |

**获取优先级**（两个变量各自独立判断）：

| 优先级 | 来源 | 动作 |
|--------|------|------|
| 1（优先） | `frontend/e2e-tests/.env` 中有值 | 直接使用，不再询问 |
| 2（最终） | 都未配置 | 询问用户手动提供 |

**5.2 需用户提供的信息**：

| 信息 | L1 需要 | L2/L3 需要 | L4 需要 | 获取方式 |
|------|---------|-----------|---------|---------|
| 登录 Token | ✅ | — | ✅ | `.env` 的 `TOKEN` 或浏览器 F12 → localStorage → `X-Auth-Token` |
| 测试数据 ID | ✅ | — | ✅ | 从测试环境或 DB 获取 |
| 多角色账号 | — | — | L4 多角色时 | `.env` 的 `TOKEN_*` 变量 |

> 环境地址（`BASE_URL` / `API_URL`）和 Token 均优先从 `frontend/e2e-tests/.env` 读取，配好后无需每次手动传入。

### Step 6：执行测试

**后端 L1 / L2/L3 可复制命令** → 必读 [005-backend-test-run.mdc](references/005-backend-test-run.mdc)。

摘要：

```bash
# L1：见 005（加载 .env，BASE_URL 可继承 API_URL）

# L2/L3
cd backend && mvn test

# L4
cd frontend && npx playwright test
```

### Step 7：收集测试结果

执行完成后，按以下方式收集各层级结果：

| 层级 | 结果来源 | 提取方式 |
|------|---------|---------|
| L1 | cURL 终端输出 | 解析 `print_result` 输出的 HTTP 状态码 + response body |
| L2/L3 | `mvn test` 控制台 | 解析 `Tests run: X, Failures: Y, Errors: Z, Skipped: W` |
| L4 | Playwright list/JSON 输出 | 解析 `N passed, M failed, K skipped` |
| 手动 | 用户手动填写 | testcase.md §7 手动测试表格中的「实际结果」和「状态」列 |

### Step 8：生成 testreport.md（测试报告）

**必读**：[004-test-report-template.mdc](references/004-test-report-template.mdc)

基于 Step 7 收集的结果，生成独立的测试报告文件。

**判定规则**：

| 条件 | 结论 |
|------|------|
| 全部通过（跳过 ≤ 2 条且均为 P2/P3） | ✅ 通过 |
| 有失败但全部为 P2/P3，或跳过 > 2 条 | 🟡 有条件通过（必须填遗留项） |
| 任何 P0 失败，或 P1 失败 ≥ 2 条 | 🔴 不通过 |

输出：`docs/测试文档/{模块名称}-testreport.md`

---

## 产出物总览

```
docs/测试文档/                         # 项目根目录下的测试文档目录
├── {模块名称}-testcase.md            # 测试用例（本 skill 产出，设计源头）
├── {模块名称}-testreport.md          # 测试报告（本 skill 产出，执行记录）
└── {模块名称}-test-l1.sh             # L1 cURL 批量执行脚本（Step 4 派生）

# 从 testcase.md 派生（按策略按需）：
backend/src/test/java/com/spacetime/...Test.java   # L2 / L3
frontend/e2e-tests/{模块名}.spec.ts                # L4
```

> **L1 脚本执行方式**：`API_URL=xxx TOKEN=xxx bash docs/测试文档/{模块名称}-test-l1.sh`

## L4 本地 Playwright 环境

```
frontend/e2e-tests/                 # Playwright 基础设施，位于前端项目下
├── package.json                    # @playwright/test 已安装
├── playwright.config.ts            # Chromium only + video + retries
├── .env                            # BASE_URL / API_URL / TOKEN（见 003 模板）
└── tests/
    ├── helpers/auth.ts             # Token 注入（X-Auth-Token）+ 多角色支持
    └── {模块名}.spec.ts            # 从 testcase.md L4 章节派生
```

## 与其他 skill 的集成

| Skill | 关系 |
|-------|------|
| **superpowers:writing-plans** | 上游 → 技术方案中的接口/流程是测试用例的直接来源 |
| **superpowers:requesting-code-review** | 上游 → 代码审查 Critical/Warning 转化为 P0/P1 测试用例 |
| **superpowers:verification-before-completion** | 上游 → 编译验证通过后触发测试 |
| **gstack-qa** | 并行 → QA 全面功能+安全测试覆盖 |
| **git-utils** | 下游 → testreport.md 结论为 ✅/🟡 后提交 |

## references 文件索引

| 编号 | 文件 | 内容 | 加载时机 |
|------|------|------|---------|
| 001 | [001-testcase-spec.mdc](references/001-testcase-spec.mdc) | 策略决策 + 用例分类 + testcase.md 文档模板 | Step 2-3 始终 |
| 002 | [002-backend-test-templates.mdc](references/002-backend-test-templates.mdc) | L1 cURL + L2 MockMvc + L3 JUnit 模板（含版本适配） | Step 3-4 后端测试时 |
| 003 | [003-playwright-e2e-template.mdc](references/003-playwright-e2e-template.mdc) | L4 Playwright E2E 测试模板（多 UI 框架） | Step 3-4 命中 L4 时 |
| 004 | [004-test-report-template.mdc](references/004-test-report-template.mdc) | testreport.md 测试报告模板 | Step 8 始终 |
| 005 | [005-backend-test-run.mdc](references/005-backend-test-run.mdc) | L1 / Maven / SSC JUnitCore **执行命令速查** | Step 6 执行后端测试时 |
