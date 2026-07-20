# PRD-07 推广规则与代理运营收敛 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 PRD-07 正式版和静态 Demo 收敛为无风控、永久邀请关系、注册成功固定口径、命中档位时一次性额外奖励、代理二维码内聚于代理列表的首版方案。

**Architecture:** 先修改模块公共定义与一期目标等单一事实源，再同步后台端内菜单、模块 PRD 和页面规格；已发布的详情页面 ID 改为抽屉承接，冻结与素材页面 ID 保留并标记已废弃。静态 Demo 将管理端从 9 个菜单页缩减为 5 个菜单页，详情使用抽屉，二维码使用弹窗，本地 Mock 仅保留有效关系及待发放/已发放/发放失败奖励。

**Tech Stack:** Markdown PRD、HTML5、CSS3、原生 JavaScript、项目共享静态 Demo 样式、Playwright Chromium。

---

### Task 1: 更新 PRD 单一事实源

**Files:**
- Modify: `docs/需求文档/PRD找茬确认问题清单.md`
- Modify: `docs/需求文档/一期上线目标.md`
- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/PRD-07_模块公共定义.md`

- [x] **Step 1:** 将邀请成功口径固定为完成注册，关系永久有效且无状态/风控字段。
- [x] **Step 2:** 将阶梯规则定义为仅命中累计人数档位时生成一笔额外奖励流水，并写入 1/5/8 人计算示例。
- [x] **Step 3:** 将奖励状态收敛为待发放、已发放、发放失败，删除冻结/作废状态、风控配置和通知。
- [x] **Step 4:** 将代理结算定义为北京时间每月 1 日 01:00 生成上一个自然月结算单，状态仅待确定/已确定。

### Task 2: 更新后台信息架构与页面规格

**Files:**
- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/管理后台/ADM-07_端内定义.md`
- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/管理后台/模块PRD文档/模块PRD_ADM-07_推广管理.md`
- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/管理后台/页面规格/*.md`

- [x] **Step 1:** 菜单只保留规则配置、邀请关系、邀请奖励、校园代理、代理结算五页。
- [x] **Step 2:** 规则配置仅保留普通邀请奖励和代理奖励两个 Tab，移除统计卡、有效期、成功口径、封顶、分组、结算周期、关系和风控 Tab。
- [x] **Step 3:** 将邀请关系详情、代理详情改为来源列表中的右侧抽屉规格。
- [x] **Step 4:** 更新关系、奖励、代理、结算字段与操作；冻结和素材规格标记已废弃且无入口。

### Task 3: 同步移动端 PRD

**Files:**
- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/移动端/模块PRD文档/模块PRD_APP-07_推广裂变与邀请奖励.md`
- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/移动端/页面规格/*.md`

- [x] **Step 1:** 删除移动端冻结/无效关系与奖励状态，成功人数固定为完成注册人数。
- [x] **Step 2:** 将记录筛选与文案收敛到邀请成功、待发放、已发放、发放失败。
- [x] **Step 3:** 更新阶梯额外奖励展示和规则说明，不再引用风控或有效期配置。

### Task 4: 先更新 Demo 静态门禁（TDD 红灯）

**Files:**
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/verify-demo.mjs`

- [x] **Step 1:** 将管理端门禁改为 5 个菜单页、2 个详情抽屉和二维码弹窗。
- [x] **Step 2:** 增加过期概念禁用门禁：统计卡、成功口径选择、邀请有效期、每日封顶、风控、冻结处理、素材管理、代理分组不得出现在管理端运行态。
- [x] **Step 3:** 执行门禁并确认旧 Demo 因仍含过期页面与字段而失败。

### Task 5: 重构静态 Demo

**Files:**
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/admin.html`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/miniapp.html`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/mock/demo-data.js`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/assets/demo.css`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/assets/demo.js`

- [x] **Step 1:** 实现双 Tab 规则配置、奖励模式联动和可悬浮/聚焦的阶梯计算问号提示。
- [x] **Step 2:** 实现关系已发放奖励列、关系详情抽屉和三态奖励流水。
- [x] **Step 3:** 实现新代理字段、可点击状态、代理详情抽屉及奖金/结算表。
- [x] **Step 4:** 实现二维码弹窗、本地 PNG 保存和 ClipboardItem 图片复制降级反馈。
- [x] **Step 5:** 实现自然月结算列表和唯一“确定结算”操作，删除打款、冻结与素材运行态。

### Task 6: 验收与报告

**Files:**
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/verify-browser.mjs`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/00-文档读取与页面范围.md`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/01-页面元素清单.md`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/02-静态HTML实现方案.md`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/03-静态HTML自测与还原度报告.md`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/04-静态HTML交付报告.md`
- Replace: `docs/静态Demo/07-推广裂变与邀请奖励/截图证据/*.png`

- [x] **Step 1:** 浏览器验证 3 个移动页、5 个管理菜单页、2 个详情抽屉、二维码弹窗、阶梯提示和确定结算。
- [x] **Step 2:** 删除旧冻结/素材/独立详情页截图并生成新的逐页证据。
- [x] **Step 3:** 用 `view_image` 对照既有后台基线与最新截图，记录五项以上视觉核对结果。
- [x] **Step 4:** 更新覆盖矩阵、自测评分、限制和交付清单，执行 PRD 评审与最终独立复跑。
