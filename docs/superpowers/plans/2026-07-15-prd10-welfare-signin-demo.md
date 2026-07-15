# PRD-10 福利中心与每日签到 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 基于 PRD-10 正式版实现可直接浏览和交互演示的移动端每日签到页与后台签到规则配置页。

**Architecture:** 使用 `docs/静态Demo/10-福利中心与每日签到/` 下的纯静态 HTML/CSS/JavaScript，数据集中在 `mock/demo-data.js`，交互集中在 `assets/demo.js`。移动端和管理后台共享视觉 token，但分别保持单任务移动体验与表格化运营体验。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、项目共享静态 Demo 基础样式、本地 HTTP 服务、浏览器截图验证。

---

### Task 1: 固化 PRD 和视觉输入

**Files:**
- Modify: `docs/需求文档/需求文档-正式版/10-福利中心与每日签到/**/*.md`
- Create: `docs/静态Demo/10-福利中心与每日签到/视觉概念.png`
- Create: `docs/静态Demo/10-福利中心与每日签到/00-文档读取与页面范围.md`
- Create: `docs/静态Demo/10-福利中心与每日签到/01-页面元素清单.md`
- Create: `docs/静态Demo/10-福利中心与每日签到/02-静态HTML实现方案.md`

- [x] **Step 1:** 对照一期上线目标将发奖记录查询定为 P0，并修正动态周期、状态、验收、并发与回滚缺口。
- [x] **Step 2:** 生成覆盖移动端和后台完整界面的视觉概念，保存到 Demo 目录。
- [x] **Step 3:** 写清页面范围、控件、状态、交互、token 和文件职责，不添加任务、抽奖、补签等超范围能力。
- [x] **Step 4:** 运行 `rg -n '待确认|TBD|TODO' docs/需求文档/需求文档-正式版/10-福利中心与每日签到 docs/静态Demo/10-福利中心与每日签到`，预期无未闭环占位符。

### Task 2: 实现移动端签到闭环

**Files:**
- Create: `docs/静态Demo/10-福利中心与每日签到/html/miniapp.html`
- Create: `docs/静态Demo/10-福利中心与每日签到/html/mock/demo-data.js`
- Create: `docs/静态Demo/10-福利中心与每日签到/html/assets/demo.css`
- Create: `docs/静态Demo/10-福利中心与每日签到/html/assets/demo.js`

- [x] **Step 1:** 在 mock 中定义 7 天周期、今日可签到、历史记录和奖励数据。
- [x] **Step 2:** 实现标题、连续签到摘要、横向奖励轨道、签到按钮、最近记录、规则抽屉与成功弹窗。
- [x] **Step 3:** 实现 `available -> signed` 本地状态更新；重复点击不得新增第二条记录或第二笔奖励。
- [x] **Step 4:** 增加“可签到/已签到/奖励处理中/活动关闭/网络错误”演示状态切换，并确保关闭态无补签入口。

### Task 3: 实现后台配置与记录查询

**Files:**
- Create: `docs/静态Demo/10-福利中心与每日签到/html/admin.html`
- Modify: `docs/静态Demo/10-福利中心与每日签到/html/mock/demo-data.js`
- Modify: `docs/静态Demo/10-福利中心与每日签到/html/assets/demo.css`
- Modify: `docs/静态Demo/10-福利中心与每日签到/html/assets/demo.js`

- [x] **Step 1:** 实现活动状态、今日签到人数、今日发币、失败数统计和规则/记录 Tab。
- [x] **Step 2:** 实现周期、基础奖励、逐日额外奖励编辑；周期变化自动增删奖励输入列。
- [x] **Step 3:** 发布时执行完整性校验并弹二次确认；成功后版本递增并新增变更日志。
- [x] **Step 4:** 实现用户编号、日期、奖励状态筛选、重置和分页；记录表展示连续天数、奖励、状态与流水号。
- [x] **Step 5:** 实现活动启停确认与变更日志抽屉，不提供人工补签、余额修改或导出。

### Task 4: 入口、静态检查与视觉验收

**Files:**
- Create: `docs/静态Demo/10-福利中心与每日签到/html/index.html`
- Modify: `docs/静态Demo/index.html`
- Create: `docs/静态Demo/10-福利中心与每日签到/03-静态HTML自测与还原度报告.md`
- Create: `docs/静态Demo/10-福利中心与每日签到/04-静态HTML交付报告.md`
- Create: `docs/静态Demo/10-福利中心与每日签到/截图证据/*.png`

- [x] **Step 1:** 添加模块总览和总入口链接。
- [x] **Step 2:** 运行 `node --check docs/静态Demo/10-福利中心与每日签到/html/assets/demo.js`，预期退出码 0。
- [x] **Step 3:** 启动 `python3 -m http.server 4173 --directory docs/静态Demo`，用浏览器打开三个 HTML 页面。
- [x] **Step 4:** 验证移动端签到、状态切换、规则抽屉；验证后台 Tab、筛选、周期编辑、发布、启停和日志抽屉。
- [x] **Step 5:** 在 390px 移动视口和 1440px 桌面视口截图，并用 `view_image` 与 `视觉概念.png` 对比布局、文案、字体、色彩、容器和交互状态。
- [x] **Step 6:** 将差异、修复和最终门禁写入自测与交付报告。
