# PRD-06 管理后台、后台能力与小程序闭环实施计划

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development to implement this plan task-by-task.

**Goal:** 将“06-认证与安全设置、我的页与搜索”静态 Demo 落为可持久化、可审计、可配置的管理后台与后端能力，并对接小程序形成设置、合规内容、注销、搜索及我的页入口闭环。

**Architecture:** 复用现有 `content_article`、`search_block_word`、`app_user_cancel_request`、`app_user_search_log` 与 RBAC 体系，不新增重复业务域。通过增量迁移补齐合规内容稳定编码/版本、注销申请编号/风险快照/执行记录和搜索摘要；后台新增面向 PRD-06 的专用接口与页面，旧的超范围页面不再作为一期入口。小程序菜单结构由客户端按 Demo 固定，接口只提供账号状态、合规内容、业务数据和动态配置。

**Tech Stack:** Java 21、Spring Boot 3.4、MyBatis-Plus、MySQL、Redis、React 18、TypeScript、Vite、Tailwind、Taro 4、微信小程序。

---

## 范围基线

- 后台新增可见菜单严格为：
  - 内容管理配置
    - 公告与协议
    - 搜索屏蔽词
  - 用户安全设置
    - 注销申请
- 公告与协议配置仅允许编辑、预览、启停预置内容，不允许新增或删除。
- 搜索屏蔽词仅支持精确匹配和包含匹配，启停与编辑均记录审计。
- 注销申请后台只读查看并追加备注，不提供审批、代撤销或手工改状态。
- 小程序设置菜单固定为手机号绑定、微信绑定、隐私设置、第三方信息共享清单、个人信息收集清单、关于我们、退出登录。
- 一期不展示搜索热词、通知设置、黑名单、不看 TA、个人关键词、反馈箱、独立安全中心和移动端入口动态配置。

### Task 1: 建立 PRD-06 契约门禁

**Files:**
- Create: `backend/src/test/java/com/spacetime/prd06/Prd06SchemaContractTest.java`
- Create: `backend/src/test/java/com/spacetime/admin/service/impl/ComplianceContentAdminServiceImplTest.java`
- Create: `backend/src/test/java/com/spacetime/miniapp/service/impl/MiniappAccountSecurityServiceImplTest.java`
- Create: `backend/src/test/java/com/spacetime/miniapp/service/impl/MiniappSearchResultServiceImplTest.java`
- Create: `miniapp/scripts/test-prd06-miniapp-flow.cjs`
- Create: `miniapp/scripts/validate-prd06-scope.mjs`
- Modify: `miniapp/package.json`

**Step 1: 写数据库和菜单契约失败测试**

- 断言迁移包含合规内容稳定编码、版本、注销申请编号、风险快照、执行日志、备注明细、搜索摘要。
- 断言可见菜单层级和名称与 Demo 完全一致。
- 断言热词、反馈箱、移动端入口配置不出现在 PRD-06 新菜单中。

**Step 2: 写后端业务失败测试**

- 合规 H5 地址变化时 `v1.9` 自动升级为 `v2.0`，仅改标题/状态版本不变。
- 注销硬阻断不创建申请，可确认风险允许提交，重复提交幂等，撤销后状态为 `RESTORED`。
- 搜索按 `sourceScene` 限定结果类型，命中违规词返回统一阻断，不写入成功历史。

**Step 3: 写小程序领域失败测试**

- 设置菜单顺序精确匹配 Demo。
- 搜索历史按账号隔离、去重、倒序且最多 10 条。
- `global/community/recommend` 分别映射用户/动态/话题、动态/话题、用户。
- 硬阻断不可提交、风险项确认后可提交、后悔期可撤销。

**Step 4: 运行测试确认先红**

Run:

```bash
cd backend && mvn -q -Dtest=Prd06SchemaContractTest,ComplianceContentAdminServiceImplTest,MiniappAccountSecurityServiceImplTest,MiniappSearchResultServiceImplTest test
cd miniapp && node --test scripts/test-prd06-miniapp-flow.cjs
cd miniapp && node scripts/validate-prd06-scope.mjs
```

Expected: 新契约对应的类、字段、迁移或页面尚不存在，测试失败且失败原因与需求一致。

### Task 2: 增量数据库迁移与初始化

**Files:**
- Create: `backend/docs/sql/migration-20260717-prd06-admin-miniapp-closure.sql`
- Modify: `backend/docs/sql/schema-content.sql`
- Modify: `backend/docs/sql/schema-user-security.sql`

**Step 1: 扩展内容、屏蔽词、注销和搜索摘要字段**

- `content_article` 增加 `content_code`、`version`、`preinitialized`，建立未删除稳定编码唯一约束。
- `search_block_word` 建立“词 + 匹配方式 + 未删除”唯一约束，保留 `block_type` 与 `reason_code` 两个独立维度。
- `app_user_cancel_request` 增加申请编号、阻断/风险快照、会员/千寻币/退款/争议/处罚摘要、执行记录、下次重试时间。
- 新增 `app_user_cancel_remark` 作为追加备注和审计明细。
- 新增或补齐 `app_user_search_summary`，保存最近有效搜索时间、30 天搜索次数和违规命中次数。

**Step 2: 初始化合规内容和动态配置**

- 预置用户协议、隐私政策、隐私摘要、单身承诺函、第三方信息共享清单、个人信息收集清单、平台信息管理规范、公告、帮助。
- 初始化注销后悔期、注销原因、注销说明、客服链接等配置键；已存在值不覆盖业务数据。
- 初始化搜索屏蔽词原因字典与注销状态字典。

**Step 3: 收敛 RBAC 菜单**

- 创建“内容管理配置”和“用户安全设置”两个 Demo 分组。
- 创建“公告与协议”“搜索屏蔽词”“注销申请”三个可见菜单。
- 创建查看、编辑、启停、备注等功能权限，授予超级管理员。
- 隐藏 PRD-06 范围内已废弃的搜索热词与反馈箱入口，不删除历史数据。

**Step 4: 运行数据库契约测试**

Run:

```bash
cd backend && mvn -q -Dtest=Prd06SchemaContractTest test
```

Expected: PASS。

### Task 3: 公告与协议后台能力

**Files:**
- Create: `backend/src/main/java/com/spacetime/admin/controller/ComplianceContentController.java`
- Create: `backend/src/main/java/com/spacetime/admin/dto/request/ComplianceContentPageReq.java`
- Create: `backend/src/main/java/com/spacetime/admin/dto/request/ComplianceContentUpdateReq.java`
- Create: `backend/src/main/java/com/spacetime/admin/dto/response/ComplianceContentVO.java`
- Create: `backend/src/main/java/com/spacetime/admin/service/ComplianceContentAdminService.java`
- Create: `backend/src/main/java/com/spacetime/admin/service/impl/ComplianceContentAdminServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/common/entity/ContentArticle.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/ContentArticleDao.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/impl/ContentArticleDaoImpl.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/ContentOperationLogDao.java`

**Step 1: 实现只读列表和详情**

- 仅返回 `preinitialized=1` 的 PRD-06 内容。
- 默认按预置顺序和生效时间排序。
- 返回内容编码、类型、标题、版本、状态、生效时间、H5 地址和原生兜底正文。

**Step 2: 实现受控编辑**

- 只允许修改标题、状态、H5 地址和原生兜底正文。
- 校验 URL、内容编码、标题长度和状态枚举。
- H5 地址变化自动升级版本，写内容操作审计。
- 停用关键协议要求显式确认。

**Step 3: 运行服务测试**

Run:

```bash
cd backend && mvn -q -Dtest=ComplianceContentAdminServiceImplTest test
```

Expected: PASS。

### Task 4: 搜索屏蔽词与搜索闭环

**Files:**
- Modify: `backend/src/main/java/com/spacetime/admin/dto/request/SearchBlockWordPageReq.java`
- Modify: `backend/src/main/java/com/spacetime/admin/dto/request/SearchBlockWordSaveReq.java`
- Modify: `backend/src/main/java/com/spacetime/admin/dto/response/SearchBlockWordVO.java`
- Modify: `backend/src/main/java/com/spacetime/admin/service/impl/SearchBlockWordAdminServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/common/entity/SearchBlockWord.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/SearchBlockWordDao.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/impl/SearchBlockWordDaoImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/controller/MiniappSearchResultController.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/MiniappSearchResultService.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappSearchResultServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/MiniappSearchResultPageVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/dto/response/MiniappSearchResultItemVO.java`

**Step 1: 收敛后台屏蔽词能力**

- 只接受 `EXACT` 和 `FUZZY`。
- 同词同匹配方式唯一。
- 保存、启停记录操作人、前后状态和时间。
- 查询支持词、类型、原因、状态。

**Step 2: 改造小程序搜索接口**

- 参数增加 `sourceScene`，未识别值降级为 `global`。
- `global` 返回用户/动态/话题，`community` 返回动态/话题，`recommend` 仅返回用户。
- 使用 App 用户数据而非后台管理员用户。
- 过滤注销、冻结、不可见用户和停用/下架内容。
- 命中 `SEARCH_VIOLATION` 时返回阻断结果；`RESULT_BLOCK` 只过滤结果。
- 成功搜索写搜索日志并更新搜索摘要。

**Step 3: 运行搜索服务测试**

Run:

```bash
cd backend && mvn -q -Dtest=MiniappSearchResultServiceImplTest test
```

Expected: PASS。

### Task 5: 注销状态机、风险校验和定时执行

**Files:**
- Create: `backend/src/main/java/com/spacetime/common/entity/AppUserCancelRemark.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/AppUserCancelRemarkDao.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/impl/AppUserCancelRemarkDaoImpl.java`
- Create: `backend/src/main/java/com/spacetime/common/mapper/AppUserCancelRemarkMapper.java`
- Create: `backend/src/main/java/com/spacetime/common/task/AccountCancellationTask.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/MiniappAccountCancelCheckVO.java`
- Modify: `backend/src/main/java/com/spacetime/common/entity/AppUserCancelRequest.java`
- Modify: `backend/src/main/java/com/spacetime/common/enums/CancelRequestStatusEnum.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/AppUserCancelRequestDao.java`
- Modify: `backend/src/main/java/com/spacetime/common/dao/impl/AppUserCancelRequestDaoImpl.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/controller/MiniappAccountSecurityController.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/MiniappAccountSecurityService.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/MiniappAccountSecurityServiceImpl.java`
- Modify: `backend/src/main/java/com/spacetime/admin/dto/request/CancelRequestPageReq.java`
- Modify: `backend/src/main/java/com/spacetime/admin/dto/request/CancelRequestRemarkReq.java`
- Modify: `backend/src/main/java/com/spacetime/admin/dto/response/AdminCancelRequestVO.java`
- Modify: `backend/src/main/java/com/spacetime/admin/service/impl/UserSecurityCancelAdminServiceImpl.java`

**Step 1: 增加实时注销校验接口**

- 每次打开注销确认弹窗重新校验。
- 硬阻断包括账号处罚、未完成退款、进行中争议和依赖服务不可用。
- 可确认风险包括未到期会员、千寻币余额等。
- 返回结构化阻断项、风险项、后悔期天数和重新校验凭证。

**Step 2: 完成提交、幂等和撤销**

- 硬阻断不创建申请。
- 风险已确认时创建申请，生成申请编号并保存风险快照。
- 同一用户同时只有一个后悔期申请。
- 后悔期内可撤销为 `RESTORED`，撤销写审计。

**Step 3: 完成后台只读与追加备注**

- 查询支持申请编号、成家号、手机号、状态、日期范围、是否阻断。
- 详情返回 Demo 要求的账号、资产、退款、争议、处罚、风险和执行字段。
- 备注只追加，不覆盖历史，不允许后台改变注销状态。

**Step 4: 完成到期定时任务**

- 扫描到期申请并重新执行硬阻断校验。
- 通过则将账号和申请置为已注销。
- 新硬阻断则保持后悔期，记录执行日志和下次重试时间。

**Step 5: 运行注销服务测试**

Run:

```bash
cd backend && mvn -q -Dtest=MiniappAccountSecurityServiceImplTest test
```

Expected: PASS。

### Task 6: 管理后台三个 Demo 菜单页面

**Files:**
- Create: `frontend/src/api/prd06.ts`
- Create: `frontend/src/pages/content/ComplianceContentPage.tsx`
- Modify: `frontend/src/pages/content/SearchBlockWordPage.tsx`
- Modify: `frontend/src/pages/user-security/CancelRequestPage.tsx`
- Modify: `frontend/src/router/index.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/index.css`
- Modify: `frontend/e2e-tests/tests/content.spec.ts`
- Modify: `frontend/e2e-tests/tests/user-security.spec.ts`

**Step 1: 实现公告与协议页面**

- 按 Demo 的页头、说明、六列表格、状态标签和刷新按钮布局。
- 页面不出现新增和删除。
- 编辑弹窗只允许标题、状态、H5 地址；预览弹窗承接目标 H5。
- 生产数据展示完整预置项，不因 Demo 只有 6 条而丢失隐私摘要、单身承诺函和帮助。

**Step 2: 收敛搜索屏蔽词页面**

- 按 Demo 布局实现页头、筛选、表格、新增/编辑弹窗。
- 移除删除按钮和前缀匹配。
- 启停二次确认，展示错误、空态和分页。

**Step 3: 收敛注销申请页面**

- 按 Demo 增加状态流转说明卡、查询条件和列表列。
- 详情展示全部风险与执行字段。
- 只允许追加内部备注，不展示阻断或状态编辑控件。

**Step 4: 注册正式路由**

- `/mobile-config/compliance`
- `/operation/search-block-words`
- `/user-safety/cancellations`
- 旧路由保留重定向，避免历史深链失效。

**Step 5: 运行构建和 E2E**

Run:

```bash
cd frontend && npm run build
cd frontend && npx playwright test e2e-tests/tests/content.spec.ts e2e-tests/tests/user-security.spec.ts
```

Expected: 构建通过，三个页面主链路测试通过。

### Task 7: 小程序设置、合规内容和帮助闭环

**Files:**
- Create: `miniapp/src/pages/settings/privacy.tsx`
- Create: `miniapp/src/pages/settings/privacy.config.ts`
- Create: `miniapp/src/pages/settings/help.tsx`
- Create: `miniapp/src/pages/settings/help.config.ts`
- Create: `miniapp/src/domain/prd06Settings.ts`
- Modify: `miniapp/src/app.config.ts`
- Modify: `miniapp/src/pages/settings/index.tsx`
- Modify: `miniapp/src/pages/settings/account-cancel.tsx`
- Modify: `miniapp/src/pages/settings/about.tsx`
- Modify: `miniapp/src/pages/settings/announcements.tsx`
- Modify: `miniapp/src/pages/settings/content.tsx`
- Modify: `miniapp/src/pages/settings/settings.scss`
- Modify: `miniapp/src/services/settings.ts`
- Modify: `miniapp/src/types/settings.ts`
- Modify: `miniapp/src/hooks/useProfile.ts`
- Modify: `miniapp/src/pages/profile/index.tsx`

**Step 1: 固定设置菜单**

- 菜单结构和顺序精确匹配 Demo。
- 合规内容的标题、版本、状态、地址由接口返回。
- 注销入口移到隐私设置页。

**Step 2: 完成隐私与注销弹窗**

- 隐私页只展示隐私说明、账号注销、隐私政策和个人信息清单。
- 打开注销弹窗时实时校验。
- 分别展示正常、硬阻断、可确认风险、后悔期和撤销状态。
- 撤销注销二次确认；阻断解除后重新进入必须重查。

**Step 3: 完成合规内容容器**

- 按 `contentCode` 查询可信内容。
- 展示标题、版本、生效时间。
- H5 打开失败时展示错误和原生正文兜底，不出现永久加载中。
- 公告支持分页、刷新、空态和详情分流。

**Step 4: 接通我的页入口**

- 认证徽章与认证引导跳现有 `pages/verification/my-certification`。
- 帮助与客服跳帮助页，客服缺失显示固定降级提示。
- 注销后悔期在我的页展示风险提示并可跳隐私页撤销。

### Task 8: 小程序搜索闭环

**Files:**
- Create: `miniapp/src/pages/search/index.tsx`
- Create: `miniapp/src/pages/search/index.config.ts`
- Create: `miniapp/src/pages/search/result.tsx`
- Create: `miniapp/src/pages/search/result.config.ts`
- Create: `miniapp/src/pages/search/search.scss`
- Create: `miniapp/src/services/search.ts`
- Create: `miniapp/src/types/search.ts`
- Create: `miniapp/src/domain/searchFlow.ts`
- Modify: `miniapp/src/app.config.ts`
- Modify: `miniapp/src/pages/community/index.tsx`
- Modify: `miniapp/src/pages/recommend/index.tsx`

**Step 1: 实现搜索首页**

- 顶部输入框、取消、按账号存储的最近 10 条历史和清空确认。
- 不展示热词。
- 空白词不请求，命中违规词提示且不进入结果页。

**Step 2: 实现搜索结果**

- Tab 由 `sourceScene` 固定映射。
- Tab 切换保留关键词，分页追加结果。
- 用户、动态、话题卡分别跳对应详情；不可见结果过滤后显示空态。
- 不展示年龄、身高、城市等筛选控件。

**Step 3: 接通搜索入口**

- 社区传 `community`。
- 推荐传 `recommend`。
- 全局入口传 `global`。

**Step 4: 运行小程序门禁和构建**

Run:

```bash
cd miniapp && node --test scripts/test-prd06-miniapp-flow.cjs
cd miniapp && node scripts/validate-prd06-scope.mjs
cd miniapp && npm run build:weapp:dev
```

Expected: 门禁和微信小程序构建通过。

### Task 9: 执行 SQL、联调与验收

**Files:**
- Create: `docs/验收报告/2026-07-17-PRD06管理后台后台能力与小程序闭环-acceptance.md`
- Create: `docs/验收报告/截图证据/2026-07-17-PRD06/`

**Step 1: 执行迁移**

- 使用 `backend/.env.local` 中的开发数据库配置执行 `migration-20260717-prd06-admin-miniapp-closure.sql`。
- 查询表结构、预置内容、字典、菜单、权限和配置值确认落库。
- 不在命令输出、日志或验收文档中暴露任何数据库凭据。

**Step 2: 运行全量验证**

Run:

```bash
cd backend && mvn test
cd frontend && npm run build
cd miniapp && npm run build:weapp:dev
```

Expected: 全部通过；若存在与本任务无关的历史失败，记录失败命令、首个错误和隔离验证结果。

**Step 3: 启动本地服务**

Run:

```bash
cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=dev
cd frontend && npm run dev -- --host 127.0.0.1
```

Expected: 后端健康接口可访问，管理后台可登录并显示三个 Demo 菜单。

**Step 4: 逐页运行态验收**

- 公告与协议：列表、编辑、版本升级、预览、停用确认。
- 搜索屏蔽词：新增、编辑、启停、搜索阻断。
- 注销申请：列表、详情、追加备注、定时任务状态。
- 小程序：设置菜单、隐私注销、合规内容、公告、帮助客服、搜索三来源、我的页入口。
- 采集与 Demo 对照截图，并在报告中列出差异、原因和还原度。

**Step 5: 最终差异核查**

Run:

```bash
git diff --check
git status --short
```

Expected: 无空白错误；只包含本任务改动和执行前已存在的用户改动。
