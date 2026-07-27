# PRD-07 完成注册奖励固定开启 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将后台推广规则配置中普通邀请、推广员两个 Tab 的“完成注册”奖励事件固定为开启且不可关闭，并同步正式 PRD 与验收。

**Architecture:** 由 PRD-07 模块公共定义维护固定业务口径，页面规格补充交互与验收标准；静态 Demo 使用禁用复选框和“固定开启”文案表达状态，并在脚本中进行运行时兜底。

**Tech Stack:** Markdown、HTML、CSS、原生 JavaScript、Node.js 静态校验、Playwright 浏览器校验。

---

### Task 1: 先补固定开启测试

**Files:**
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/verify-demo.mjs`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/verify-browser.mjs`

1. 增加两个“完成注册”固定事件控件的静态断言。
2. 增加控件始终选中、禁用且不受角色切换影响的浏览器断言。
3. 执行静态校验并确认新断言先失败。

### Task 2: 修改 Demo

**Files:**
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/admin.html`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/assets/demo.css`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/assets/demo.js`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/mock/demo-data.js`

1. 两个 Tab 的“完成注册”状态改为选中且禁用。
2. 在状态列显示“固定开启”。
3. 增加运行时兜底，角色切换和发布前都强制恢复固定状态。
4. Mock 数据增加 `required: true`。

### Task 3: 同步正式 PRD

**Files:**
- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/PRD-07_模块公共定义.md`
- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/管理后台/模块PRD文档/模块PRD_ADM-07_推广管理.md`
- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/管理后台/页面规格/ADM-07-PAGE-promo-rule-config_推广规则配置页.md`

1. 明确“好友完成注册即邀请成功”为固定业务口径。
2. 明确普通邀请、推广员的完成注册奖励事件固定启用，金额仍可配置。
3. 增加页面验收标准和版本记录。

### Task 4: 验证与截图

**Files:**
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/截图证据/PRD-07-04-管理端推广规则配置.png`
- Create: `docs/验收报告/2026-07-27-PRD-07完成注册奖励固定开启-acceptance.md`

1. 执行 JavaScript 语法检查和静态校验。
2. 启动本地服务并执行浏览器校验。
3. 检查管理端截图，确认两个 Tab 的固定状态表达清晰。
4. 执行 `git diff --check` 并记录验收结果。
