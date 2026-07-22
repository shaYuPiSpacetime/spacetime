# PRD-02 关系反馈口径与 Demo 对齐实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的 11 项关系反馈口径同步到 PRD-02/04/05/06，并让小程序与管理后台 Demo 展示一致行为。

**Architecture:** PRD-02 继续作为喜欢、访客、匹配生命周期的单一事实源；PRD-04 仅保留隐藏访问的后续权益预留；PRD-05 新增统一婚恋用户主页并包含个人动态区；PRD-06 明确一期无隐藏访问入口。Demo 只调整现有静态交互与展示，不扩展真实后端业务接口。

**Tech Stack:** Markdown PRD、React 18 + TypeScript + Vite、Taro React 小程序。

---

### Task 1: 统一 PRD-02 关系状态与一期范围

**Files:**
- Modify: `docs/需求文档/需求文档-正式版/定稿：02-关系反馈与互动链路/PRD-02_模块公共定义.md`
- Modify: `docs/需求文档/需求文档-正式版/定稿：02-关系反馈与互动链路/移动端/页面规格/APP-01_喜欢我的列表页.md`
- Modify: `docs/需求文档/需求文档-正式版/定稿：02-关系反馈与互动链路/移动端/页面规格/APP-02_最近看过我的列表页.md`
- Modify: `docs/需求文档/需求文档-正式版/定稿：02-关系反馈与互动链路/移动端/页面规格/APP-03_相互喜欢列表页.md`

- [ ] 删除一期隐藏访问入口、统计、接口和后台筛选要求，改为后续预留。
- [ ] 将匹配改为“单一有效关系 + 多来源明细”，取消喜欢只撤销爱心来源。
- [ ] 明确普通用户最多 10 条模糊记录、`total` 为有效真实总数、会员每页 20 条。
- [ ] 明确访客展示记录 30 分钟去重但 PV 累计。

### Task 2: 统一后台权限、留存与分页

**Files:**
- Modify: `docs/需求文档/需求文档-正式版/定稿：02-关系反馈与互动链路/管理后台/ADM-02_端内定义.md`
- Modify: `docs/需求文档/需求文档-正式版/定稿：02-关系反馈与互动链路/管理后台/页面规格/App用户管理列表-关系反馈字段补充.md`
- Modify: `docs/需求文档/需求文档-正式版/定稿：02-关系反馈与互动链路/管理后台/页面规格/App用户详情-关系记录区块.md`

- [ ] 删除隐藏访问筛选、摘要和明细字段。
- [ ] 写明关系事实永久保留、注销后匿名化、前台移除。
- [ ] 将四类关系明细改为默认 10 条并支持 10/20/50。

### Task 3: 同步 PRD-04/05/06 边界

**Files:**
- Modify: `docs/需求文档/需求文档-正式版/定稿：04-商业化（VIP、千寻币、解锁与资产中心）/PRD-04_模块公共定义.md`
- Modify: `docs/需求文档/需求文档-正式版/定稿：05-推荐模块（朋友、社区与内容互动）/PRD-05_模块公共定义.md`
- Modify: `docs/需求文档/需求文档-正式版/定稿：05-推荐模块（朋友、社区与内容互动）/移动端/APP-05_端内定义.md`
- Modify: `docs/需求文档/需求文档-正式版/定稿：05-推荐模块（朋友、社区与内容互动）/移动端/模块PRD文档/模块PRD_APP-05_推荐模块（朋友、社区与内容互动）.md`
- Create: `docs/需求文档/需求文档-正式版/定稿：05-推荐模块（朋友、社区与内容互动）/移动端/页面规格/APP-16_婚恋用户主页.md`

- [ ] 将隐藏访问标记为一期不开发、配置不可启用的后续权益预留。
- [ ] 新增 `APP-05-PAGE-user-profile`，把个人动态区作为主页区块。
- [ ] 定义主页访客写入、喜欢/取消、匹配聊天、举报拉黑和异常态。

### Task 4: 调整小程序 Demo

**Files:**
- Modify: `miniapp/src/pages/heart/user.tsx`
- Modify: `miniapp/src/pages/heart/mutual.tsx`
- Modify: `miniapp/src/pages/membership/index.tsx`

- [ ] 为婚恋主页增加真实可见的喜欢/取消、聊天、举报/拉黑和个人动态交互。
- [ ] 相互喜欢列表继续只展示有效关系并进入统一主页。
- [ ] 会员权益 Demo 移除一期隐藏访问/隐身展示。
- [ ] 运行 `cd miniapp && npm run build:weapp`，预期构建成功。

### Task 5: 调整管理后台 Demo

**Files:**
- Modify: `frontend/src/pages/customers/CustomersPage.tsx`

- [ ] 删除隐藏访问筛选和摘要卡。
- [ ] 将关系记录拆为喜欢、访客、相互喜欢、解锁 Tab。
- [ ] 增加默认 10 条、10/20/50 可切换分页交互。
- [ ] 运行 `cd frontend && npm run build`，预期构建成功。

### Task 6: 文档评审与验证

**Files:**
- Read: `docs/需求文档/标准/05_PRD评审清单.md`

- [ ] 搜索并清除一期文档中可生效的隐藏访问口径。
- [ ] 核对 11 项口径在 PRD 与 Demo 中均有对应结果。
- [ ] 检查 Git diff，仅包含本次相关改动且不覆盖用户既有修改。
