# PRD-07 推广裂变与邀请奖励重构实施计划

> **For Codex:** REQUIRED SUB-SKILL: 按本计划逐项实施，严格执行 RED → GREEN → REFACTOR；每个任务完成后运行对应测试，不以编译通过代替业务验证。

**目标：** 按最新版 PRD-07 与已确认 Demo，重写推广规则、永久邀请关系、普通奖励、校园代理、月度结算、管理后台五页和小程序三页，并完成真实浏览器验收。

**架构：** 保留 Spacetime 单体六层架构和通用基础设施；跨端推广领域逻辑统一放在 `common`。使用不可变规则版本、本地数据库事件收件箱、对象级邀请计数器、奖励/资产双幂等和自然月结算保证一致性。

**技术栈：** Java 21/Spring Boot 3.4/MyBatis-Plus/MySQL/Redis；React 18/TypeScript/Vite/Tailwind；Taro/React/SCSS；JUnit 5/Mockito/MockMvc/Playwright。

---

## 任务 1：锁定测试设计与旧能力删除清单

**文件：**

- 已重写：`docs/测试文档/推广裂变-testcase.md`
- 已删除待重建：`docs/测试文档/推广裂变-test-l1.sh`
- 已删除待执行后重建：`docs/测试文档/推广裂变-testreport.md`
- 修改：`frontend/e2e-tests/tests/promotion.spec.ts`

**步骤：**

1. 运行 `rg` 确认 testcase 只使用 `pending/success/failed`、`enabled/disabled`、`pending_confirm/confirmed`。
2. 为旧冻结、素材、paid、客户端 bind 路由先写 404 契约测试。
3. 为五菜单、两抽屉、三移动页写失败的 Playwright 页面树测试。
4. 运行测试，确认旧实现使这些用例失败，保存 RED 证据。

## 任务 2：重建数据库基线与领域枚举

**文件：**

- 修改：`backend/docs/sql/schema-promotion.sql`
- 新增：`backend/docs/sql/migration-20260727-prd07-promotion-rewrite.sql`
- 删除/修改：`backend/src/main/java/com/spacetime/common/enums/Promotion*.java`
- 新增/修改：`backend/src/main/java/com/spacetime/common/entity/Promotion*.java`
- 修改：`backend/src/main/java/com/spacetime/common/entity/UserCoinLog.java`
- 测试：`backend/src/test/java/com/spacetime/common/database/PromotionSchemaSqlTest.java`
- 测试：`backend/src/test/java/com/spacetime/common/entity/PromotionEntityContractTest.java`

**RED：**

1. 写 schema 契约测试，要求无关系状态/风险/paid 字段，要求规则当前指针、事件收件箱、计数器和资产幂等键。
2. 写枚举测试，要求正式三组状态和六类奖励事件，旧值全部不存在。
3. 运行：

```bash
cd backend
JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home \
  mvn test -Dtest=PromotionSchemaSqlTest,PromotionEntityContractTest
```

**GREEN：**

1. 重写 schema，并提供旧表 `_legacy_20260727` 迁移。
2. 重建规则、事件、关系、计数器、奖励、代理奖金和结算实体。
3. 给资产流水增加 `biz_idempotency_key` 唯一约束和字段。
4. 让契约测试通过。

**REFACTOR：**

1. 删除不再引用的 Relation/Risk/Bonus 旧枚举。
2. 统一中文 Javadoc 和数据库字段命名。

## 任务 3：规则不可变版本发布

**文件：**

- 新增/修改：`backend/src/main/java/com/spacetime/common/dao/PromotionRule*.java`
- 新增/修改：`backend/src/main/java/com/spacetime/common/mapper/PromotionRule*.java`
- 新增：`backend/src/main/java/com/spacetime/common/service/PromotionRuleDomainService.java`
- 新增：`backend/src/main/java/com/spacetime/common/service/impl/PromotionRuleDomainServiceImpl.java`
- 测试：`backend/src/test/java/com/spacetime/common/service/PromotionRuleDomainServiceImplTest.java`

**RED：**

1. 写普通/代理版本独立、注册事件不可关闭、金额精度、阶梯递增、并发版本冲突测试。
2. 写事件发生时锁定规则版本测试。

**GREEN：**

1. 实现 `promotion_rule`、event、tier、current DAO/Mapper。
2. 实现事务发布：锁 current、校验 expectedVersion、插新版本、切指针。
3. current 查询返回双来源配置。

**REFACTOR：**

1. 将金额、模式、事件校验提取为纯值对象/校验器。
2. 消除 Service 中硬编码默认金额。

## 任务 4：来源归因、永久关系与事件收件箱

**文件：**

- 新增：`backend/src/main/java/com/spacetime/common/service/PromotionAttributionService.java`
- 新增：`backend/src/main/java/com/spacetime/common/service/PromotionEventInboxService.java`
- 新增：`backend/src/main/java/com/spacetime/common/service/PromotionEventProcessService.java`
- 新增对应 `impl/`、DAO、Mapper
- 修改：`backend/src/main/java/com/spacetime/miniapp/dto/request/WechatLoginReq.java`
- 修改：`backend/src/main/java/com/spacetime/miniapp/dto/request/PhoneLoginReq.java`
- 修改：`backend/src/main/java/com/spacetime/miniapp/service/impl/AuthMiniappServiceImpl.java`
- 测试：`backend/src/test/java/com/spacetime/common/service/PromotionAttributionServiceImplTest.java`
- 测试：`backend/src/test/java/com/spacetime/common/service/PromotionEventInboxServiceImplTest.java`

**RED：**

1. 写普通/代理绑定、代理优先、自邀、老用户、已有关系不可覆盖测试。
2. 写注册重放、并发注册、停用代理和进程恢复测试。

**GREEN：**

1. 匿名来源记录只保存必要字段。
2. 新用户注册事务写 register 收件箱，老用户不写。
3. 提交后立即处理，任务扫描兜底。
4. `invitee_id` 唯一键作为最终防重。

**REFACTOR：**

1. 删除 miniapp 客户端主动 bind 主链路。
2. 删除关系状态推进方法。

## 任务 5：奖励、阶梯和千寻币发放补偿

**文件：**

- 新增：`backend/src/main/java/com/spacetime/common/service/PromotionRewardDomainService.java`
- 新增：`backend/src/main/java/com/spacetime/common/service/PromotionCoinGrantService.java`
- 新增：`backend/src/main/java/com/spacetime/common/task/PromotionRewardRetryJob.java`
- 修改：`backend/src/main/java/com/spacetime/common/dao/UserAssetDao.java`
- 修改：`backend/src/main/java/com/spacetime/common/dao/UserCoinLogDao.java`
- 修改对应 DAOImpl/Mapper
- 测试：`backend/src/test/java/com/spacetime/common/service/PromotionRewardDomainServiceImplTest.java`
- 测试：`backend/src/test/java/com/spacetime/common/service/PromotionCoinGrantServiceImplTest.java`
- 测试：`backend/src/test/java/com/spacetime/common/task/PromotionRewardRetryJobTest.java`

**RED：**

1. 写第1/5/8人、并发第5/6人、规则快照、零金额测试。
2. 写余额/流水/奖励同事务、并发双发、失败回滚测试。
3. 写 5m/30m/2h、最多3次和人工重试测试。

**GREEN：**

1. 实现 counter 行锁和基础/阶梯两种幂等键。
2. 实现奖励行锁、资产行锁和资产流水唯一键。
3. 实现失败状态记录与重试 Job。

**REFACTOR：**

1. 将重试时间计算提取为纯函数。
2. 统一资产流水场景枚举和描述。

## 任务 6：校园代理、永久二维码、统计和结算

**文件：**

- 重写：`backend/src/main/java/com/spacetime/common/entity/PromotionAgent*.java`
- 新增/修改对应 DAO/Mapper
- 新增：`backend/src/main/java/com/spacetime/common/service/PromotionAgentBonusService.java`
- 新增：`backend/src/main/java/com/spacetime/common/service/PromotionSettlementDomainService.java`
- 新增：`backend/src/main/java/com/spacetime/common/task/PromotionSettlementJob.java`
- 新增：`backend/src/main/java/com/spacetime/common/task/PromotionStatRebuildJob.java`
- 测试：`backend/src/test/java/com/spacetime/common/service/PromotionAgentBonusServiceImplTest.java`
- 测试：`backend/src/test/java/com/spacetime/common/service/PromotionSettlementDomainServiceImplTest.java`

**RED：**

1. 写代理两态、二维码并发一对一、停用后不建关系/不计新奖金测试。
2. 写代理基础/阶梯奖金、无独立状态测试。
3. 写闰年/大小月、月份唯一、建单归集同事务、确认并发测试。

**GREEN：**

1. 实现代理、二维码、奖金和可重建统计。
2. 实现北京时间每月1日01:00任务和 `pending_confirm -> confirmed`。
3. 上月未完成推广事件存在时阻塞对应代理结算并告警。

**REFACTOR：**

1. 删除 agent event 冗余事实表或停止运行。
2. 删除二维码多版本/启停和结算 paid 逻辑。

## 任务 7：后台五组 API、导出和审计

**文件：**

- 重写：`backend/src/main/java/com/spacetime/admin/controller/Promotion*.java`
- 重写：`backend/src/main/java/com/spacetime/admin/service/Promotion*.java`
- 重写：`backend/src/main/java/com/spacetime/admin/service/impl/Promotion*.java`
- 重写：`backend/src/main/java/com/spacetime/admin/dto/request/Promotion*.java`
- 重写：`backend/src/main/java/com/spacetime/admin/dto/response/Promotion*.java`
- 新增：`backend/src/main/java/com/spacetime/admin/service/PromotionExportAdminService.java`
- 新增：`backend/src/main/java/com/spacetime/common/entity/PromotionExportTask.java`
- 测试：`backend/src/test/java/com/spacetime/admin/controller/Promotion*ControllerTest.java`

**RED：**

1. 按 testcase §5 写精确 `R<T>`、DTO、权限和旧路由 404 测试。
2. 写导出筛选、脱敏、CSV 注入和审计测试。

**GREEN：**

1. 只保留规则、关系、奖励、代理、结算五组 Controller。
2. 接入 common 领域服务，Controller 不返 Entity/Map。
3. 实现四类异步导出任务和审计。

**REFACTOR：**

1. 删除 Rule 通用 CRUD、Material、Frozen、Paid Controller/DTO。
2. 统一业务编号路径参数。

## 任务 8：资料、认证和支付事件接入

**文件：**

- 修改：`backend/src/main/java/com/spacetime/common/service/impl/AppUserAuditServiceImpl.java`
- 修改：`backend/src/main/java/com/spacetime/miniapp/service/impl/PaymentServiceImpl.java`
- 修改：必要的审核聚合 ServiceImpl
- 测试：对应现有审核/支付测试类
- 新增：`backend/src/test/java/com/spacetime/integration/PromotionBusinessEventIntegrationTest.java`

**RED：**

1. 写头像首次通过、实名+学历双通过、首次 VIP、首次充值和重复回调测试。
2. 写推广处理失败不回滚审核/支付测试。

**GREEN：**

1. 主业务成功事务只入事件收件箱。
2. 使用业务事实和唯一事件键判定首次。
3. 让跨模块集成测试通过。

**REFACTOR：**

1. 统一事件入箱调用。
2. 删除旧 miniapp PromotionInviteEventService。

## 任务 9：管理后台五页面

**文件：**

- 重写：`frontend/src/api/promotion.ts`
- 新增：`frontend/src/types/promotion.ts`
- 删除：`frontend/src/pages/promotion/PromotionManagement.tsx`
- 新增：`frontend/src/pages/promotion/PromotionRulesPage.tsx`
- 新增：`frontend/src/pages/promotion/PromotionRelationsPage.tsx`
- 新增：`frontend/src/pages/promotion/PromotionRewardsPage.tsx`
- 新增：`frontend/src/pages/promotion/PromotionAgentsPage.tsx`
- 新增：`frontend/src/pages/promotion/PromotionSettlementsPage.tsx`
- 新增：`frontend/src/features/promotion/**`
- 新增：`frontend/src/components/ui/drawer.tsx`
- 修改：`frontend/src/router/index.tsx`
- 测试：`frontend/e2e-tests/tests/promotion.spec.ts`

**RED：**

1. 运行页面树、双 Tab、固定开启、抽屉和二维码 E2E，确认旧单页失败。

**GREEN：**

1. 按 Demo 拆五页，生产视觉沿用 AdminLayout。
2. 实现两个抽屉、二维码弹窗和二次确认。
3. 删除废弃路由。

**REFACTOR：**

1. 提取共享分页、筛选、状态标签、金额/时间格式。
2. 确保 1280px 仅表格内部滚动。

**验证：**

```bash
cd frontend
npm run build
```

## 任务 10：小程序三页面与分享/H5降级

**文件：**

- 重写：`miniapp/src/services/promotion.ts`
- 新增：`miniapp/src/types/promotion.ts`
- 新增：`miniapp/src/pages/promotion/invite-home.tsx`
- 新增：`miniapp/src/pages/promotion/invite-home.scss`
- 新增：`miniapp/src/pages/promotion/invite-records.tsx`
- 新增：`miniapp/src/pages/promotion/invite-records.scss`
- 新增：`miniapp/src/pages/promotion/invite-rules.tsx`
- 新增各页面 config
- 修改：`miniapp/src/app.config.ts`
- 修改：`miniapp/src/hooks/useProfile.ts`
- 新增：`miniapp/scripts/validate-promotion-ui.mjs`

**RED：**

1. 静态门禁先断言三页注册、入口跳转、首页禁止项和关键状态文案。
2. 运行门禁，确认当前失败。

**GREEN：**

1. 按基线实现首页真实组件和动态阶梯。
2. 实现记录四筛选、分页和明细展开。
3. 实现规则 H5 当前/缓存/不可用三态。
4. 实现微信分享和复制链接降级。

**REFACTOR：**

1. 提取移动端卡片、状态视图和格式化函数。
2. 确保图片只承载非交互装饰。

**验证：**

```bash
cd miniapp
npm run build:h5
npm run build:weapp:dev
node scripts/validate-promotion-ui.mjs
```

## 任务 11：派生 L1、完整回归与代码审查

**文件：**

- 新增：`docs/测试文档/推广裂变-test-l1.sh`
- 重写：`frontend/e2e-tests/tests/promotion.spec.ts`
- 新增/重写：所有 Promotion L2/L3 测试

**步骤：**

1. 从 testcase §4 逐条派生 L1，先准备后读取再写入，所有写后重新查询。
2. L1 不硬编码 Token、密码或测试环境地址。
3. 执行全量后端测试、前端构建、小程序双构建。
4. 按 `git diff` 做自审：架构、事务、幂等、权限、敏感信息、废弃代码、N+1。
5. 将审查发现新增到 testcase §补充用例并修复。

## 任务 12：恢复本地环境并做真实浏览器闭环

**文件：**

- 本地私有配置：`backend/src/main/resources/application-dev.yml`（不得提交）
- 截图：`docs/测试文档/验收截图/prd07/`

**步骤：**

1. 使用已有 `.example` 和安全环境变量恢复 dev 配置，不把密钥写入仓库。
2. 验证 MySQL、Redis、`/health` 和真实 `/admin/login`。
3. 启动后端、前端、小程序 H5。
4. 使用 peter 页面登录，执行 testcase §7；不得注 Token 冒充真实登录。
5. 每发现一个问题，按“复现 → 根因 → 最小修复 → 回归 → 全量复测”循环。
6. 邀请首页在 375×812、414×896 截图；后台在 1440×900、1280×800 截图。
7. 用 `view_image` 对比基线和最终截图，输出至少 5 个视觉比对点。
8. 微信专属分享/scene 使用微信开发者工具补测；确有外部阻塞时记录证据和内部替代验证。

## 任务 13：测试报告、最终验证与 Git

**文件：**

- 新增：`docs/测试文档/推广裂变-testreport.md`

**步骤：**

1. 依据真实输出填写 L1/L2/L3/L4/手动结果，不预填通过。
2. 任何 P0 失败或跳过时继续修复，不进入提交。
3. 运行最终：

```bash
git diff --check
cd backend && JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home mvn test
cd frontend && npm run build
cd miniapp && npm run build:h5 && npm run build:weapp:dev
```

4. 核对 `git status`，只提交本任务文件。
5. 使用 Conventional Commits 创建提交。
6. 推送 `codex/prd07-promotion-rewrite`，确认远端分支存在。
