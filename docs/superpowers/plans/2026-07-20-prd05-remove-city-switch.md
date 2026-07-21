# PRD-05 Remove City Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 PRD-05 同城信息流收敛为“只按当前用户资料城市浏览”，删除本期手动切换城市、城市搜索、热门城市和 GPS 定位能力，并同步静态 Demo 与蓝湖缺失页面清单。

**Architecture:** 以 `APP-02_成家同城信息流页.md` 作为页面级事实源，模块公共定义、端内定义和模块 PRD 只引用“资料城市只读”口径。静态 Demo 删除所有城市切换入口，仅展示资料城市来源说明；缺失清单移除废弃画板 `APP-05-city-02` 并重算覆盖统计。

**Tech Stack:** Markdown PRD、HTML5、原生 JavaScript、Node.js 静态契约校验、Playwright Chrome 浏览器回归。

---

### Task 1: 建立本期无城市切换的失败门禁

**Files:**
- Create: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/verify-city-scope.mjs`

- [x] **Step 1: 编写断言**

断言正式 PRD、Demo 和缺失清单中不再出现 `APP-05-city-02`、`ACT-change-city`、手动切换城市、城市选择器、热门城市和城市搜索；同时必须出现“资料城市只读”“完善资料”和“去热门”。

- [x] **Step 2: 运行红灯**

Run: `node docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/verify-city-scope.mjs`

Expected: FAIL，列出旧城市切换口径。

### Task 2: 收敛正式 PRD 范围

**Files:**
- Modify: `docs/需求文档/需求文档-正式版/05-推荐模块（朋友、社区与内容互动）/移动端/页面规格/APP-02_成家同城信息流页.md`
- Modify: `docs/需求文档/需求文档-正式版/05-推荐模块（朋友、社区与内容互动）/PRD-05_模块公共定义.md`
- Modify: `docs/需求文档/需求文档-正式版/05-推荐模块（朋友、社区与内容互动）/移动端/APP-05_端内定义.md`
- Modify: `docs/需求文档/需求文档-正式版/05-推荐模块（朋友、社区与内容互动）/移动端/模块PRD文档/模块PRD_APP-05_推荐模块（朋友、社区与内容互动）.md`
- Modify: `docs/需求文档/需求文档-正式版/05-推荐模块（朋友、社区与内容互动）/移动端/页面规格/APP-05_发布动态页.md`
- Modify: `docs/需求文档/需求文档-正式版/05-推荐模块（朋友、社区与内容互动）/PRD-05_甲方前置准备清单.md`

- [x] **Step 1: 删除城市切换画板与动作**

将 APP-02 画板从 3 张收敛为主页面和空态 2 张，删除选择器、搜索、历史和切换动作。

- [x] **Step 2: 固化资料城市只读规则**

同城查询只使用 PRD-01 已审核资料城市；资料城市缺失时不请求同城列表并引导完善资料；城市无内容时提供刷新和去热门。

- [x] **Step 3: 对齐发布位置字段**

发布页城市字段改为资料城市只读，不允许借发布表单选择其他城市。

### Task 3: 修改静态 Demo

**Files:**
- Modify: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/html/miniapp.html`
- Modify: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/00-文档读取与页面范围.md`
- Modify: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/01-页面元素清单.md`
- Modify: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/02-静态HTML实现方案.md`
- Modify: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/03-静态HTML自测与还原度报告.md`
- Modify: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/04-静态HTML交付报告.md`

- [x] **Step 1: 删除切换入口**

同城页顶部仅显示“资料城市：杭州（只读）”，无按钮、下拉或点击热区。

- [x] **Step 2: 补充空态说明**

资料城市缺失时引导完善资料；有城市但无内容时提供刷新和去热门。

### Task 4: 重算蓝湖缺失清单

**Files:**
- Modify: `docs/需求文档/需求文档-正式版/05-推荐模块（朋友、社区与内容互动）/蓝湖UI缺少页面清单.md`

- [x] **Step 1: 删除废弃画板**

删除 `APP-05-city-02`，将同城主页面从部分覆盖调整为完整覆盖。

- [x] **Step 2: 更新统计**

PRD 画板 75 张：完整 20、部分 13、明确缺失 42；完整覆盖率 26.7%，计入部分后 44.0%。

### Task 5: 验证

**Files:**
- Test: all files above

- [x] **Step 1: 运行静态门禁**

Run: `node docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/verify-city-scope.mjs`

Expected: PASS。

- [x] **Step 2: 运行现有回归**

Run: `node docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/verify-reverse-gaps.mjs`

Expected: PASS 14 项。

- [x] **Step 3: 浏览器回归**

确认同城页存在资料城市只读提示，且不存在城市切换可交互控件；保存最新截图证据并用 `view_image` 检查。

- [x] **Step 4: 文档与统计校验**

校验唯一画板数为 75、Demo 页面仍为 17、Markdown 链接有效、`git diff --check` 无阻塞错误。
