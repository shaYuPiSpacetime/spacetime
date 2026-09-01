# 内容审核与自我介绍异常修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复小程序填写自我介绍后出现“系统异常”的审核反馈链路；让内容管理明确提供“通过/驳回”；确保管理后台操作日志仅展示中文。

**Architecture:** 保留现有微信内容安全审核与内容状态码，在服务层把供应商技术原因归一化为中文业务原因，在小程序端根据审核结果决定停留或进入下一步。管理后台继续提交稳定状态码，但根据当前状态生成中文动作，并由后端与前端两层完成日志中文化；服务端中文文案统一接入 `COMMUNITY_COPY`。同步补齐生产数据库迁移门禁，避免应用代码、配置与表结构不一致。

**Tech Stack:** Java 21、Spring Boot 3.4、JUnit 5、Mockito、React 18、TypeScript、Playwright、Taro、Node.js 静态契约测试、GitHub Actions、MySQL。

## Global Constraints

- 不修改用户已有的 `bobo-todo.md` 变更。
- 不改变无冲突时的微信手机号认证流程；同一手机号已有账号时以手机号唯一账号为准恢复身份。
- 管理后台展示中文文案，但后端状态码仍使用现有英文枚举，避免破坏接口兼容性。
- 先写失败测试，再做最小实现，最后执行完整构建与回归验证。

---

### Task 1: 建立数据库迁移部署门禁

**Files:**
- Modify: `scripts/validate-prod-deploy-config.mjs`
- Modify: `.github/workflows/deploy-backend-prod.yml`
- Create: `deploy/sql/prod/080_prd05_audit_log_chinese_copy.sql`

- [x] 在部署配置校验脚本中断言 078、079 与新增的 080 均被复制并执行。
- [x] 运行 `node scripts/validate-prod-deploy-config.mjs`，确认用例先因 079 缺失而失败。
- [x] 将 079、080 迁移加入生产部署工作流的 SCP 来源与迁移命令。
- [x] 重新运行部署配置校验并确认通过。

### Task 2: 修复自我介绍内容审核反馈

**Files:**
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/OpenTextAuditServiceImplTest.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/OpenTextAuditServiceImpl.java`
- Create: `miniapp/scripts/test-introduction-submit-feedback.cjs`
- Modify: `miniapp/src/types/prd01.ts`
- Modify: `miniapp/src/services/prd01.ts`
- Modify: `miniapp/src/pages/verification/intro.tsx`

- [x] 新增后端风险文本测试，断言审核记录被拒绝、用户收到中文原因且不暴露 `wechat_risky`。
- [x] 新增小程序静态契约测试，断言提交接口返回有类型的审核结果，拒绝时停留当前页并显示原因，不再无条件跳转。
- [x] 分别运行后端定向测试与 Node 契约测试，记录预期失败。
- [x] 在开放文本审核服务中保留中文供应商说明，将非中文技术码替换为统一中文安全提示。
- [x] 为自我介绍提交结果补充 TypeScript 类型，并在页面按 `auditStatus` 分支处理；只有非拒绝结果进入三重认证页。
- [x] 历史审核记录中的英文技术原因在详情回显时同步转换为中文提示。
- [x] 重新运行定向测试并确认通过。

### Task 3: 明确内容审核动作并中文化操作日志

**Files:**
- Modify: `frontend/e2e-tests/tests/community-ui-contract.spec.ts`
- Modify: `backend/src/test/java/com/spacetime/admin/service/CommunityAdminServiceImplTest.java`
- Modify: `backend/src/main/java/com/spacetime/admin/service/impl/CommunityAdminServiceImpl.java`
- Modify: `frontend/src/pages/community/CommunityPostManagementPage.tsx`
- Modify: `frontend/src/features/community/communityUi.tsx`

- [x] 扩展 Playwright 契约测试：待人工审核仅显示“通过/驳回”，提交仍使用现有状态码；英文动作码与技术原因不得出现在日志界面。
- [x] 扩展后端单元测试：机器审核、微信媒体回调及人工处理日志均返回中文动作、操作者和说明。
- [x] 运行前后端定向测试并确认先失败。
- [x] 将待人工审核的服务端合法转换收紧为“通过/驳回”。
- [x] 旧版动态审核接口复用相同状态约束与 CAS 更新，禁止以 `PENDING` 绕过状态机。
- [x] 前端按当前状态生成动作选项：待审核为“通过/驳回”，已公开为“下架”，已下架为“恢复”。
- [x] 后端集中映射审计动作与技术原因；前端时间线增加兜底映射，未知技术码统一显示中文通用说明。
- [x] 重新运行定向测试并确认通过。

### Task 4: 全量验证与差异审查

**Files:**
- Verify: all files changed above

- [x] 运行 `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -f backend/pom.xml test`。
- [x] 运行 `npm --prefix frontend run build`。
- [x] 显式监听 IPv4 后运行内容管理 Playwright 契约测试，17 项全部通过。
- [x] 运行 `npm --prefix miniapp run build:weapp`。
- [x] 运行 `node scripts/validate-prod-deploy-config.mjs`。
- [x] 将生产部署静态校验接入 GitHub Actions，后续遗漏迁移会在构建阶段失败。
- [x] 审查 `git diff --check`、`git diff --stat` 与 `git status --short`，确认未改动 `bobo-todo.md`。
- [x] 汇总根因、实际修复与验证证据。

### Task 5: 生产日志定位与手机号账号冲突修复

**Files:**
- Modify: `backend/src/test/java/com/spacetime/miniapp/service/AuthMiniappServiceImplTest.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/AuthMiniappServiceImpl.java`
- Execute: `deploy/sql/prod/080_prd05_audit_log_chinese_copy.sql`

- [x] 通过截图请求 ID 在生产后端日志中定位完整异常堆栈，确认不是自我介绍内容校验，而是微信临时账号绑定已有手机号时触发 `phone_hash` 唯一索引冲突。
- [x] 只读核对冲突账号状态：原手机号账号保留已有实名、头像和自我介绍审核记录，临时微信账号仅承载本轮续填资料。
- [x] 先新增失败测试，复现代码错误选择临时微信账号的问题；再实现手机号唯一账号复用与微信身份迁移。
- [x] 手机号账号仅使用 `phone_` 占位身份时允许迁移；若已绑定其他真实微信账号则明确拒绝，防止身份覆盖。
- [x] 在生产唯一数据库直接执行幂等 080 迁移，回查 41 条审计文案全部为中文。
- [x] 后端定向测试与全量 813 项测试通过。
