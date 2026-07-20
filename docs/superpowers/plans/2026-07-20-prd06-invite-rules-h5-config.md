# PRD-06 邀请规则 H5 配置 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 PRD-07 移动端“邀请规则”改为由 PRD-06 后台统一配置的 H5 内容，同时保留 PRD-07 对邀请与奖励业务规则的唯一事实源。

**Architecture:** PRD-06 的“公告与协议配置”扩展为“公告、协议与 H5 内容配置”，新增预置内容类型 `invite_rules`，负责标题、H5 URL、版本、状态与预览。PRD-07 移动端入口继续使用原页面 ID，但页面形态改为共享 H5 容器，读取 PRD-06 当前启用配置；加载失败时使用最近成功缓存，业务计算仍引用 `M07-*` 规则。

**Tech Stack:** Markdown PRD、静态 HTML/CSS/JavaScript、Node.js 门禁脚本、Playwright 浏览器验收。

---

### Task 1: 建立跨模块静态门禁

**Files:**
- Create: `docs/静态Demo/06-认证与安全设置、我的页与搜索/verify-invite-rules-h5.mjs`
- Test: `docs/静态Demo/06-认证与安全设置、我的页与搜索/verify-invite-rules-h5.mjs`

- [x] **Step 1: 写失败断言**

  断言 PRD-06 配置数据包含 `invite_rules`，后台页面出现“业务规则”Tab 与邀请规则行，PRD-07 规则页带 H5 容器来源与缓存降级标识，PRD-07 不出现可编辑 H5 URL 控件。

- [x] **Step 2: 执行红灯**

  Run: `node docs/静态Demo/06-认证与安全设置、我的页与搜索/verify-invite-rules-h5.mjs`
  Expected: FAIL，提示缺少邀请规则 H5 配置。

### Task 2: 更新 PRD-06 配置归属

**Files:**
- Modify: `docs/需求文档/需求文档-正式版/定稿：06-认证与安全设置、我的页与搜索/PRD-06_模块公共定义.md`
- Modify: `docs/需求文档/需求文档-正式版/定稿：06-认证与安全设置、我的页与搜索/管理后台/ADM-06_端内定义.md`
- Modify: `docs/需求文档/需求文档-正式版/定稿：06-认证与安全设置、我的页与搜索/管理后台/模块PRD文档/模块PRD_ADM-06_认证安全我的搜索后台承接.md`
- Modify: `docs/需求文档/需求文档-正式版/定稿：06-认证与安全设置、我的页与搜索/管理后台/页面规格/公告与协议配置.md`
- Modify: `docs/需求文档/需求文档-正式版/定稿：06-认证与安全设置、我的页与搜索/PRD-06_甲方前置准备清单.md`

- [x] **Step 1: 扩展 H5 内容定义**

  新增 `M06-TERM-h5-content`、`M06-ENUM-h5-content-type.invite_rules`、`M06-RULE-business-h5-content`、`M06-CFG-h5-content-links`，明确内容配置归 06、业务语义归来源模块。

- [x] **Step 2: 更新后台页面规格**

  增加“业务规则”Tab、邀请规则预置行、版本/启停/预览联动、字段与操作、6 类状态和 Given/When/Then 验收。

### Task 3: 更新 PRD-07 H5 消费方式

**Files:**
- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/PRD-07_模块公共定义.md`
- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/移动端/APP-07_端内定义.md`
- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/移动端/模块PRD文档/模块PRD_APP-07_推广裂变与邀请奖励.md`
- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/移动端/页面规格/APP-07-PAGE-invite-rules_活动规则页.md`
- Modify: `docs/需求文档/PRD找茬确认问题清单.md`
- Modify: `docs/需求文档/一期上线目标.md`

- [x] **Step 1: 固定跨模块边界**

  页面入口和奖励规则仍归 PRD-07；H5 标题、URL、版本、启停归 PRD-06。规则内容发布必须与生效的 `M07` 业务配置一致，不能通过 H5 改变计算逻辑。

- [x] **Step 2: 更新页面状态**

  正常态加载当前启用 H5；未配置/停用/网络失败时读取最近成功缓存；无缓存时展示不可用提示与返回/重试，不硬编码完整规则冒充最新内容。

### Task 4: 实现 06/07 静态 Demo

**Files:**
- Modify: `docs/静态Demo/06-认证与安全设置、我的页与搜索/html/admin.html`
- Modify: `docs/静态Demo/06-认证与安全设置、我的页与搜索/html/mock/demo-data.js`
- Modify: `docs/静态Demo/06-认证与安全设置、我的页与搜索/html/assets/demo.js`
- Modify: `docs/静态Demo/06-认证与安全设置、我的页与搜索/html/assets/demo.css`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/miniapp.html`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/assets/demo.js`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/assets/demo.css`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/verify-demo.mjs`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/verify-browser.mjs`

- [x] **Step 1: 写最小实现**

  06 后台增加业务规则 Tab、邀请规则配置行、编辑和 H5 预览；07 规则页改成 H5 容器壳，展示配置来源、版本并支持缓存降级状态。

- [x] **Step 2: 执行绿灯**

  Run: `node docs/静态Demo/06-认证与安全设置、我的页与搜索/verify-invite-rules-h5.mjs`
  Expected: PASS。

### Task 5: 同步 Demo 文档与浏览器证据

**Files:**
- Modify: `docs/静态Demo/06-认证与安全设置、我的页与搜索/00-文档读取与页面范围.md`
- Modify: `docs/静态Demo/06-认证与安全设置、我的页与搜索/01-页面元素清单.md`
- Modify: `docs/静态Demo/06-认证与安全设置、我的页与搜索/02-静态HTML实现方案.md`
- Modify: `docs/静态Demo/06-认证与安全设置、我的页与搜索/03-静态HTML自测与还原度报告.md`
- Modify: `docs/静态Demo/06-认证与安全设置、我的页与搜索/04-静态HTML交付报告.md`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/00-文档读取与页面范围.md`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/01-页面元素清单.md`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/02-静态HTML实现方案.md`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/03-静态HTML自测与还原度报告.md`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/04-静态HTML交付报告.md`
- Modify: `docs/静态Demo/06-认证与安全设置、我的页与搜索/截图证据/PRD-06-admin-desktop.png`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/截图证据/PRD-07-03-移动端邀请规则.png`

- [x] **Step 1: 浏览器验收**

  先使用内置浏览器；不可用时用现有 Playwright。验证 06 切换业务规则、编辑、预览；验证 07 正常 H5 与缓存降级，并检查控制台和横向溢出。

- [x] **Step 2: 视觉对照与文档收口**

  同轮查看旧版 06 后台/07 规则截图和最新截图，对照导航、表格密度、页面壳、字体、色彩、圆角、移动端溢出，更新还原度台账。

- [x] **Step 3: 最终验证**

  Run: `node --check`（两个模块 JS）、两套静态门禁、Playwright 浏览器脚本、`git diff --check`。
  Expected: 全部退出码 0，浏览器控制台错误 0，无横向溢出。
