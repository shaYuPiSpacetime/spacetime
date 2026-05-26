# 推广裂变 - 测试报告

> **关联文档**：
> - 测试用例：`docs/测试文档/推广裂变-testcase.md`
> - 技术方案：`docs/技术方案/2026-05-22-推广裂变与邀请奖励-tcdesign.md`

---

## 1. 测试概况

| 项目 | 信息 |
|------|------|
| 功能名称 | PRD-07 推广裂变与邀请奖励 |
| 测试环境 | API `http://localhost:8080`；前端 `http://127.0.0.1:5174` |
| 执行日期 | 2026-05-26 |
| 执行人 | Codex 自动化测试 |
| 后端版本 | 当前工作区代码 |
| 前端版本 | 当前工作区代码 |
| 测试策略 | L1 + L2 + L3 + 前端构建；L4 Playwright 复测仍被本机浏览器启动环境阻塞，追加 Chrome DevTools 页面级补验 |
| 测试模式 | 增量模式：基于 `推广裂变-testcase.md` 派生并执行自动化测试 |
| JDK | 22：`JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home` |
| 外部联通假设 | PRD-03 通知、PRD-04 成家币/支付、PRD-06 用户/资料/认证按用户要求默认联通成功，本轮仅验证 PRD-07 自身逻辑 |

## 2. 测试结果汇总

| 层级 | 总数 | 通过 ✅ | 失败 ❌ | 跳过 ⏭️ | 通过率 |
|------|------|--------|--------|---------|--------|
| L1 接口测试 | 37 | 34 | 0 | 3 | 100%（已实现范围） |
| L2 Controller | 9 | 9 | 0 | 0 | 100% |
| L3 Service | 25 | 25 | 0 | 0 | 100% |
| L4 E2E | 6 | 0 | 0 | 6 | — |
| L4 页面级补验 | 5 | 5 | 0 | 0 | 100% |
| 前端构建 | 1 | 1 | 0 | 0 | 100% |
| 手动测试 | 10 | 0 | 0 | 10 | — |
| **合计** | **93** | **74** | **0** | **19** | **100%（已执行项）** |

## 3. 测试结论

**判定结果**：🟡 有条件通过

**判定依据**：
- L1 已实现接口范围复测通过：`总计 37 / 通过 34 / 失败 0 / 跳过 3`。
- 后端自动化复测通过：`mvn test` 总计 `95` 个测试通过，其中 PRD-07 L2/L3 覆盖 `34` 条。
- 前端构建复测通过；L4 Playwright 已复测，但当前 macOS 沙箱内 Chromium 启动阶段 `SIGABRT` 崩溃，未进入页面断言。
- 使用 Chrome DevTools 对推广后台做页面级补验：规则配置、邀请关系、推广菜单、新增规则弹窗均可见/可操作；推广核心路由返回 200。
- 导出、代理统计、代理奖金明细等当前未完整实现接口未纳入本轮已实现范围，已在 L1 脚本中明确记录。

## 4. 失败用例明细

无。

## 5. 跳过/阻塞用例明细

| 用例ID | 层级 | 优先级 | 场景描述 | 跳过原因 | 是否需要补测 |
|--------|------|--------|---------|---------|------------|
| F2-P1-04 | L1 | P1 | 导出邀请关系 | 接口当前未实现，未纳入本轮已实现范围 | 是 |
| F3-P0-07 | L1 | P0 | 查询代理统计 | 接口当前未实现，未纳入本轮已实现范围 | 是 |
| F3-P1-04 | L1 | P1 | 导出结算明细 | 接口当前未实现，未纳入本轮已实现范围 | 是 |
| L4-01 ~ L4-06 | L4 | P0~P1 | 推广后台页面加载与弹窗交互 | Playwright 浏览器进程在启动阶段崩溃，未进入页面断言 | 是 |
| M-01 ~ M-10 | 手动 | P0~P3 | 前端人工验收 | 需人工在浏览器逐项操作验证 | 是 |

## 6. 各层级执行详情

### 6.1 L1 接口测试

```
执行命令: API_URL=http://localhost:8080 ADMIN_USERNAME=peter ADMIN_PASSWORD=000000 bash docs/测试文档/推广裂变-test-l1.sh
执行时间: 2026-05-26 11:23
前置处理: 应用 backend/docs/sql/schema-promotion.sql；补齐 700 段推广 RBAC 菜单；为 peter 保留 super_admin 并追加 promotion_l1_test 角色
```

| 分组 | 覆盖场景 | 结果 |
|------|---------|------|
| 小程序匿名接口 | 活动规则、普通分享 trace、缺参校验、代理来源、代理扫码来源 | ✅ |
| 规则管理 | 新增、列表、编辑、阶梯、重叠校验、启停、负数金额校验 | ✅ |
| 邀请/奖励 | 邀请列表、奖励列表、冻结队列、不存在奖励复核错误 | ✅ |
| 代理/代理码 | 新增代理、列表、生成代理码、暂停代理、停用代理码、必填校验 | ✅ |
| 结算单 | 生成、列表、确认、发放、重复发放错误、非法周期错误 | ✅ |
| 未实现范围 | 邀请导出、代理统计、结算导出 | ⏭️ |

**L1 汇总**：`总计 37 / 通过 34 / 失败 0 / 跳过 3`。

### 6.2 L2 Controller 测试

```
执行命令: cd backend && JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home mvn test
执行时间: 2026-05-26 11:22
框架: JUnit 5 + Mockito + MockMvcBuilders.standaloneSetup()
```

| 范围 | 结果 | 备注 |
|------|------|------|
| 规则 Controller | ✅ | 列表、新增、必填校验 |
| 代理 Controller | ✅ | 新增校验、代理码生成 |
| 结算 Controller | ✅ | 创建、非法周期 |
| 小程序推广 Controller | ✅ | 匿名规则、分享记录 |

**L2 汇总**：`9/9` 通过。

### 6.3 L3 Service 测试

```
执行命令: cd backend && JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home mvn test
执行时间: 2026-05-26 11:22
框架: JUnit 5 + Mockito Extension
```

| 范围 | 结果 | 备注 |
|------|------|------|
| 规则配置 | ✅ | 负数金额、生效失效时间、阶梯重叠、审计 |
| 奖励复核 | ✅ | frozen 通过/驳回、非 frozen 拒绝 |
| 代理与代理码 | ✅ | 默认值、生成、停用、不存在校验 |
| 结算状态流 | ✅ | pending、confirmed、paid、非法流转 |
| 小程序邀请 | ✅ | trace、绑定、自邀、重复绑定、代理优先、停用代理码 |

**L3 汇总**：`25/25` 通过。

### 6.4 全量后端回归

```
执行命令: cd backend && JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home mvn test
执行时间: 2026-05-26 11:22
```

**结果**：`Tests run: 95, Failures: 0, Errors: 0, Skipped: 0`，BUILD SUCCESS。

### 6.5 L4 E2E 浏览器测试

```
执行命令: cd frontend && PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers BASE_URL=http://127.0.0.1:5174 API_URL=http://localhost:8080 npx playwright test --config=e2e-tests/playwright.config.ts tests/promotion.spec.ts --reporter=list
执行时间: 2026-05-26 11:24 复测
```

**结果**：运行器环境阻塞，未进入页面断言。Playwright 输出 `6 failed`，失败点均为 `browserType.launch`，按环境阻塞记录为 L4 跳过/待补测，不计入业务失败。

阻塞现象：
- 初次执行缺少 Playwright Chromium：已执行 `PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers npx playwright install chromium` 安装。
- 安装后 Chromium 启动即崩溃：`Target page, context or browser has been closed`、`Received signal 6`。
- 尝试系统 Chrome、headed/headless、临时 HOME 后仍被 crashpad/旧 headless 初始化阻塞，错误包含 `chrome_crashpad_handler: --database is required`、`Crashpad/settings.dat: Operation not permitted`。
- 2026-05-26 复测使用项目 Chromium，仍在启动阶段崩溃，错误为 `Target page, context or browser has been closed`、`Received signal 6`、`headless=old` 启动后 `SIGABRT`，未进入任何页面断言。

### 6.5.1 Chrome DevTools 页面级补验

```
执行方式: Chrome DevTools 打开 http://127.0.0.1:5174/promotion/rules，注入 peter 登录态后逐页检查
执行时间: 2026-05-26 11:25
```

| 验证项 | 结果 | 备注 |
|--------|------|------|
| 推广裂变菜单与二级导航 | ✅ | 规则配置、邀请关系、奖励审核、校园代理、代理结算可见 |
| 规则配置页 | ✅ | 标题、筛选、列表、启用/阶梯操作入口可见 |
| 新增规则弹窗 | ✅ | 点击新增规则后弹窗展示，规则名称、类型、事件、奖励金额等表单项可见，取消可关闭 |
| 邀请关系页 | ✅ | 标题、邀请人/被邀人筛选、表格列与空态可见 |
| 路由健康检查 | ✅ | `/promotion/rules`、`/promotion/agents`、`/promotion/settlements` 返回 HTTP 200 |

### 6.6 前端构建测试

```
执行命令: cd frontend && npm run build
执行时间: 2026-05-26 11:22
```

**结果**：构建成功。

### 6.7 前端手动测试

| 用例ID | 优先级 | 操作步骤 | 期望结果 | 实际结果 | 状态 |
|--------|-------|---------|---------|---------|------|
| M-01 | P0 | 检查推广管理菜单及二级页展示 | 菜单名称、图标、排序、路由与技术方案一致 | 未执行 | ⏭️ |
| M-02 | P0 | 检查规则配置页筛选、分页、空态、加载态 | 搜索和分页准确，空态文案清晰 | 未执行 | ⏭️ |
| M-03 | P0 | 检查冻结处理二次确认弹窗 | 操作前必须确认并填写备注 | 未执行 | ⏭️ |
| M-04 | P0 | 检查代理新增/编辑表单 | 必填项、状态、学校、校区、规则组校验正确 | 未执行 | ⏭️ |
| M-05 | P1 | 检查结算单金额展示 | 金额字段不溢出 | 未执行 | ⏭️ |
| M-06 | P1 | 检查导出按钮 | 当前未实现接口不应误导用户 | 未执行 | ⏭️ |
| M-07 | P1 | 检查长手机号/长学校名/长备注 | 表格不撑破布局 | 未执行 | ⏭️ |
| M-08 | P2 | 检查多个页面返回和刷新 | 筛选条件、分页、Tab 状态符合预期 | 未执行 | ⏭️ |
| M-09 | P2 | 检查接口失败态 | toast 显示错误，页面不白屏 | 未执行 | ⏭️ |
| M-10 | P3 | 检查多角色按钮显隐 | 各角色只看到各自权限按钮 | 未执行 | ⏭️ |

## 7. 已修复/处理事项

| 编号 | 问题描述 | 处理内容 | 验证 |
|------|---------|---------|------|
| P7-T1 | 测试环境缺少 promotion 表导致接口 500 | 应用 `backend/docs/sql/schema-promotion.sql` | L1 重跑通过 |
| P7-T2 | `peter` 缺少 promotion 权限导致后台接口 403 | 补齐推广 RBAC 菜单并为测试角色绑定权限；保留 `super_admin` 角色 | L1 重跑通过 |
| P7-T3 | 匿名接口 `/rules`、`/share-log`、`/agent-source` 被 Token 拦截风险 | `WebConfig` 已加入匿名放行 | L1 匿名接口通过 |

## 8. 遗留问题

| 编号 | 问题描述 | 影响范围 | 优先级 | 预计处理时间 | 负责人 |
|------|---------|---------|--------|------------|--------|
| R1 | L4 Playwright 在当前 macOS 沙箱中无法启动 Chromium/Chrome；已通过 Chrome DevTools 完成页面级补验，但不能替代完整 E2E 回归 | 前端页面交互自动化未完成 | P1 | 本地浏览器权限或 Playwright 版本环境修复后补跑 | 待定 |
| R2 | 导出、代理统计、代理奖金明细接口当前未完整实现 | 后台运营完整能力 | P1 | 对应接口实现后补 L1/L4 | 待定 |
| R3 | PRD-03/04/06 外部联通默认成功，未验证真实成家币流水、通知、资料/认证事件触发 | 奖励到账闭环、通知闭环、成功邀请统计闭环 | P1 | 对应 PRD 落地后补跨模块测试 | 待定 |
| R4 | 手动多角色验收未执行 | 前端按钮显隐、真实运营体验 | P2 | QA 手动验收阶段 | 待定 |

## 9. 测试建议

- L4 可在浏览器权限正常的本机环境重跑：`cd frontend && BASE_URL=http://127.0.0.1:5174 API_URL=http://localhost:8080 npx playwright test --config=e2e-tests/playwright.config.ts tests/promotion.spec.ts --reporter=list`。
- 其他 PRD 技术方案需考虑 PRD-07 联通点：认证成功触发邀请进度、成家币入账、通知发送、支付成功生成代理奖金。
- 导出/统计/奖金明细接口落地后，追加 L1 用例并把本报告中的 3 条跳过项改为实际执行结果。
