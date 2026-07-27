# PRD-07 邀请首页 UI 对齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 以已确认的邀请好友 UI 稿为唯一视觉基线，更新 PRD-07 移动端邀请首页功能定义，并让静态 Demo 的首页结构、数据与交互一致。

**Architecture:** 保留现有单页静态 Demo 的页面切换、邀请记录、规则 H5 和后台演示，仅替换移动端邀请首页视图。首页由 `demo-data.js` 提供动态奖励、阶梯和最近邀请数据，`demo.js` 负责渲染、状态切换和分享降级，`demo.css` 负责真实 DOM 组件的高保真布局；设计稿只作为非交互人物插画的裁切素材和验收基线，不承载按钮、文字或热区。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js 静态门禁、Playwright 浏览器验收。

---

## Task 1：冻结设计基线与文档范围

- [x] 保存用户确认的 UI 稿到 `docs/静态Demo/07-推广裂变与邀请奖励/设计基线/PRD-07-01-移动端邀请首页-UI基线.png`
- [x] 确认仅修改普通用户邀请首页，校园代理二维码、邀请记录、规则 H5 与后台能力保持可用
- [x] 在 `docs/技术方案/2026-07-27-PRD-07邀请首页UI还原-tcdesign.md` 记录基线、组件映射、状态与素材策略

## Task 2：先更新 PRD-07 移动端事实源

**Files:**

- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/PRD-07_模块公共定义.md`
- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/移动端/APP-07_端内定义.md`
- Modify: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/移动端/模块PRD文档/模块PRD_APP-07_推广裂变与邀请奖励.md`
- Rewrite: `docs/需求文档/需求文档-正式版/07-推广裂变与邀请奖励/移动端/页面规格/APP-07-PAGE-invite-home_推荐给好友页.md`

执行要求：

- [x] 普通用户首页删除二维码、邀请码、保存二维码和“千寻币能做什么”
- [x] 增加“邀请注册得千寻币”、全量阶梯、最近三条邀请记录和规则摘要
- [x] 保留“立即邀请”“活动说明”“查看全部”及分享弹层/记录/规则导航
- [x] 分享不可用时降级复制邀请链接
- [x] 明确 5/+50、10/+100、20/+200 仅为当前画板示例，实际从已发布配置读取

## Task 3：先改门禁预期，再实现首页

**Files:**

- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/verify-demo.mjs`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/verify-browser.mjs`

- [x] 静态门禁改为要求注册奖励说明、完整阶梯、最近记录和规则
- [x] 静态门禁增加首页禁用项：二维码、邀请码、保存二维码、千寻币用途区
- [x] 浏览器验收改为验证正常、加载、空记录、网络错误和分享不可用状态
- [x] 先运行门禁，确认旧 Demo 不符合新断言

## Task 4：重构移动端首页 Demo

**Files:**

- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/miniapp.html`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/assets/demo.css`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/assets/demo.js`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/html/mock/demo-data.js`
- Add: `docs/静态Demo/07-推广裂变与邀请奖励/html/assets/images/invite-avatar.png`

- [x] 用真实 DOM 重建主视觉、注册奖励卡、进度卡、邀请记录卡和规则卡
- [x] 只裁切使用 UI 基线中的非交互人物插画，所有文字和控件均由 HTML/CSS 绘制
- [x] 绑定 `successCount`、`rewardTotal`、`registerReward`、`ladders`、`recentInvites`
- [x] 立即邀请打开原分享弹层；分享不可用时复制邀请链接并提示
- [x] 记录和规则入口继续进入原页面

## Task 5：同步 Demo 文档和验收记录

**Files:**

- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/00-文档读取与页面范围.md`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/01-页面元素清单.md`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/02-演示脚本.md`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/03-PRD需求覆盖矩阵.md`
- Modify: `docs/静态Demo/07-推广裂变与邀请奖励/04-自测报告.md`
- Add: `docs/验收报告/2026-07-27-PRD-07邀请首页UI还原-acceptance.md`

- [x] 记录设计基线、组件映射、状态覆盖和功能删除项
- [x] 验收报告登记视觉差异、素材处理和还原度评分

## Task 6：验证与截图闭环

Run:

```bash
cd docs/静态Demo/07-推广裂变与邀请奖励
node verify-demo.mjs
node verify-browser.mjs
```

- [x] 静态门禁通过
- [x] 浏览器脚本通过并更新首页截图证据
- [x] 同轮查看 UI 基线与最新截图，记录差异并至少修正一轮
- [x] 运行 `git diff --check`，确认没有空白错误
