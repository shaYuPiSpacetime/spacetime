# PRD-07 推广裂变与邀请奖励静态 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 PRD-07 正式版实现可直接浏览、可切换状态、可演示关键操作的移动端 3 页与管理端 9 页静态 Demo，并保持与现有模块统一的视觉语言。

**Architecture:** 使用 `docs/静态Demo/07-推广裂变与邀请奖励/` 下的纯静态 HTML/CSS/JavaScript；移动端采用单手机画布和三视图切换，管理端采用单页 Hash 路由承载九个业务页。Mock 数据集中在 `html/mock/demo-data.js`，全部本地交互集中在 `html/assets/demo.js`，公共外壳复用 `docs/静态Demo/shared/`。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、项目共享静态 Demo 样式、本地 HTTP 服务、Playwright/浏览器截图验证。

---

### Task 1: 固化范围、视觉基线与验收口径

**Files:**
- Create: `docs/静态Demo/07-推广裂变与邀请奖励/00-文档读取与页面范围.md`
- Create: `docs/静态Demo/07-推广裂变与邀请奖励/01-页面元素清单.md`
- Create: `docs/静态Demo/07-推广裂变与邀请奖励/02-静态HTML实现方案.md`

- [x] **Step 1:** 对照正式版 PRD 固化移动端 3 页、管理端 9 页、关键弹窗与异常状态。
- [x] **Step 2:** 记录视觉基线为现有 PRD-04 管理后台、PRD-06 邀请卡片、PRD-08 Demo 外壳；记录原始邀请页设计文件缺失及本轮概念图服务不可用限制。
- [x] **Step 3:** 列出每页信息、控件、状态、权限和交互，不引入真实接口、数据库或后端逻辑。

### Task 2: 先建立静态门禁（TDD 红灯）

**Files:**
- Create: `docs/静态Demo/07-推广裂变与邀请奖励/verify-demo.mjs`

- [x] **Step 1:** 编写必需文件、12 页覆盖、真实控件、Hash 路由、关键交互、Mock 边界、共享样式和无远程依赖校验。
- [x] **Step 2:** 执行 `node docs/静态Demo/07-推广裂变与邀请奖励/verify-demo.mjs`，确认因实现文件尚未创建而失败。

### Task 3: 实现移动端 3 页

**Files:**
- Create: `docs/静态Demo/07-推广裂变与邀请奖励/html/miniapp.html`
- Create: `docs/静态Demo/07-推广裂变与邀请奖励/html/mock/demo-data.js`
- Create: `docs/静态Demo/07-推广裂变与邀请奖励/html/assets/demo.css`
- Create: `docs/静态Demo/07-推广裂变与邀请奖励/html/assets/demo.js`

- [x] **Step 1:** 实现邀请首页：累计数据、阶梯进度、二维码、邀请码、保存/分享、币用途、最近邀请与规则摘要。
- [x] **Step 2:** 实现邀请记录页：汇总、五状态筛选、脱敏用户、绑定时间、奖励和异常原因。
- [x] **Step 3:** 实现邀请规则页：成功定义、奖励事件、到账、无效/风控和永久关系说明。
- [x] **Step 4:** 实现正常、空态、二维码失败、冻结、规则兜底、分享弹层与操作反馈。

### Task 4: 实现管理端 9 页

**Files:**
- Create: `docs/静态Demo/07-推广裂变与邀请奖励/html/admin.html`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/mock/demo-data.js`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/assets/demo.css`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/assets/demo.js`

- [x] **Step 1:** 实现推广规则配置页四个 Tab、字段校验、保存确认和只读权限演示。
- [x] **Step 2:** 实现邀请关系列表/详情、邀请奖励列表/冻结处理页及本地筛选、导出任务和复核操作。
- [x] **Step 3:** 实现推广员列表/详情、推广员结算、推广素材页及新增、状态、确认、打款、二维码重生成、停用和历史抽屉。
- [x] **Step 4:** 所有页面通过 Hash 隔离，按钮使用真实可见控件并绑定本地交互。

### Task 5: 入口、浏览器验收与交付报告

**Files:**
- Create: `docs/静态Demo/07-推广裂变与邀请奖励/html/index.html`
- Create: `docs/静态Demo/07-推广裂变与邀请奖励/verify-browser.mjs`
- Modify: `docs/静态Demo/index.html`
- Create: `docs/静态Demo/07-推广裂变与邀请奖励/03-静态HTML自测与还原度报告.md`
- Create: `docs/静态Demo/07-推广裂变与邀请奖励/04-静态HTML交付报告.md`
- Create: `docs/静态Demo/07-推广裂变与邀请奖励/截图证据/*.png`

- [x] **Step 1:** 添加模块总览页和静态 Demo 总入口卡片。
- [x] **Step 2:** 执行静态门禁与 `node --check`，修复至全部通过。
- [x] **Step 3:** 启动本地服务，在 390×844 移动视口和 1440×900 管理端视口逐页验证 12 个页面及关键弹窗。
- [x] **Step 4:** 生成逐页截图，使用 `view_image` 对照既有视觉基线复核布局、色彩、信息密度和交互状态。
- [x] **Step 5:** 将覆盖矩阵、差异、限制、修复结果和最终评分写入自测与交付报告。
