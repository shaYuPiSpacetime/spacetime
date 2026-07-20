# PRD-05 蓝湖反向缺口闭环实施计划

> **For Codex:** REQUIRED SUB-SKILL: Use writing-plans to execute this plan task-by-task with red-green-refactor verification.

**Goal:** 将蓝湖“千寻”页面组中已存在、但正式 PRD-05 未完整定义的互动历史、关系统计、动态收藏、发布草稿与上传状态等能力补齐，并同步到静态 Demo 与缺口清单。

**Architecture:** 在 PRD-05 模块公共定义中统一业务规则、事件和接口；通过新增页面规格承接互动历史、关注粉丝、动态互动用户列表；在现有信息流、发布、详情、话题、打招呼和更多操作页面规格中补充局部能力。静态 Demo 继续使用现有单页 HTML + 原生 JavaScript + Mock 数据架构，以真实按钮、弹层和可切换状态展示闭环。

**Tech Stack:** Markdown PRD、HTML5、CSS3、原生 JavaScript、Node.js 静态契约校验、Playwright 浏览器验收（环境可用时）。

---

### Task 1: 建立反向缺口验收门禁

**Files:**
- Create: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/verify-reverse-gaps.mjs`
- Test: `node docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/verify-reverse-gaps.mjs`

**Steps:**
1. 写入针对新增页面锚点、收藏、草稿、上传状态、申请认识别名和两级屏蔽动作的静态断言。
2. 首次执行并确认在实现前失败。

### Task 2: 补齐 PRD-05 模块级定义和信息架构

**Files:**
- Modify: `docs/需求文档/需求文档-正式版/05-推荐模块（朋友、社区与内容互动）/PRD-05_模块公共定义.md`
- Modify: `docs/需求文档/需求文档-正式版/05-推荐模块（朋友、社区与内容互动）/移动端/APP-05_端内定义.md`
- Modify: `docs/需求文档/需求文档-正式版/05-推荐模块（朋友、社区与内容互动）/移动端/模块PRD文档/模块PRD_APP-05_推荐模块（朋友、社区与内容互动）.md`

**Steps:**
1. 增加收藏、互动历史、关系列表、上传状态、草稿、两级屏蔽及申请认识别名规则。
2. 增加对应实体、事件、接口、埋点、幂等和范围口径。
3. 明确一期只提供“不看 TA 动态”的动作，不新增自助管理页。

### Task 3: 新增和修订页面规格

**Files:**
- Create: `移动端/页面规格/APP-11_千寻互动中心页.md`
- Create: `移动端/页面规格/APP-17_关注粉丝列表页.md`
- Create: `移动端/页面规格/APP-18_动态互动用户列表页.md`
- Modify: `移动端/页面规格/APP-01_成家关注信息流页.md`
- Modify: `移动端/页面规格/APP-02_成家同城信息流页.md`
- Modify: `移动端/页面规格/APP-03_成家热门信息流页.md`
- Modify: `移动端/页面规格/APP-04_话题列表页.md`
- Modify: `移动端/页面规格/APP-05_发布动态页.md`
- Modify: `移动端/页面规格/APP-06_动态详情页.md`
- Modify: `移动端/页面规格/APP-07_话题详情页.md`
- Modify: `移动端/页面规格/APP-13_社区打招呼页.md`
- Modify: `移动端/页面规格/APP-15_社区更多操作弹窗.md`
- Modify: `移动端/页面规格/APP-16_婚恋用户主页.md`

**Steps:**
1. 补齐画板、字段、动作、状态和验收标准。
2. 对关注空态、话题预览、参与者头像、信息流作者字段与评论预览建立明确口径。
3. 将“申请认识”统一映射为打招呼/悄悄话入口。

### Task 4: 扩展静态 Demo

**Files:**
- Modify: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/html/miniapp.html`
- Modify: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/html/mock/demo-data.js`
- Modify: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/html/assets/demo.js`
- Modify: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/html/assets/demo.css`

**Steps:**
1. 新增互动中心、关注粉丝和互动用户列表页面。
2. 增加收藏切换、草稿保存/恢复、上传状态、申请认识入口、按内容/按用户屏蔽动作。
3. 补充信息流评论预览、话题最新动态及参与者信息。

### Task 5: 更新交付文档与缺口清单

**Files:**
- Create: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/00-文档读取与页面范围.md`
- Create: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/01-页面元素清单.md`
- Create: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/02-静态HTML实现方案.md`
- Create: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/03-静态HTML自测与还原度报告.md`
- Modify: `docs/静态Demo/05-推荐模块（朋友、社区与内容互动）/04-静态HTML交付报告.md`
- Modify: `docs/需求文档/需求文档-正式版/05-推荐模块（朋友、社区与内容互动）/蓝湖UI缺少页面清单.md`

**Steps:**
1. 登记来源、页面元素、实现范围和自测结果。
2. 将第 6 节反向缺口逐项标记为已闭环，并写明 PRD/Demo 落点。

### Task 6: 全量验证

**Files:**
- Test: all files above

**Steps:**
1. 执行 Node 静态契约校验并修复全部失败项。
2. 校验 Markdown 内部链接、页面 ID 唯一性和 JavaScript 语法。
3. 环境允许时执行 Playwright 截图与交互验收；否则记录可执行的静态核对证据。
4. 审阅 git diff，确保不覆盖工作区内其他模块的用户改动。
