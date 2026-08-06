# 千寻互动整体 UI 还原闭环实施计划

> **For Codex:** REQUIRED SUB-SKILL: Use test-driven-development to implement this plan task-by-task.

**Goal:** 按蓝湖 66 稿恢复千寻互动、浏览记录、我的动态及其关联动态卡，并以真实社区接口、真实 OSS 图标和微信运行截图形成闭环。

**Architecture:** 复用现有 `/miniapp/community/me/interactions`、`/me/posts`、`/me/profile-summary` 接口，不新增本地业务缓存。新增纯展示领域函数负责互动日期分组；新增共享小组件统一性别、评论、点赞图标。页面保持现有三个主面板常驻，仅调整数据映射和视觉布局。

**Tech Stack:** Taro 4、React 18、TypeScript、微信小程序、Node.js 静态门禁、miniprogram-automator。

---

### Task 1: 固化设计与数据基线

**Files:**
- Create: `docs/技术方案/2026-08-05-千寻互动整体-蓝湖还原-tcdesign.md`
- Reference: `docs/验收报告/截图证据/2026-07-22-千寻66稿/蓝湖基线/007.png`
- Reference: `docs/验收报告/截图证据/2026-07-22-千寻66稿/蓝湖基线/039.png`
- Reference: `docs/验收报告/截图证据/2026-07-22-千寻66稿/蓝湖基线/183.png`

- [ ] 登记页面分组、状态、尺寸、间距和素材。
- [ ] 登记真实接口字段与 UI 消费关系。
- [ ] 明确蓝湖缺口和不脑补边界。

### Task 2: 先写失败门禁

**Files:**
- Create: `miniapp/scripts/test-qianxun-interactions-closure.cjs`
- Create: `miniapp/src/domain/qianxunInteractionPresentation.ts`
- Modify: `miniapp/package.json`
- Modify: `miniapp/scripts/validate-prd05-community-closure.mjs`

- [ ] 断言浏览记录使用 `getCommunityInteractions('viewed')`。
- [ ] 断言互动记录保留 `interactionTime` 与 `post`。
- [ ] 断言完整日期分组与卡片日期格式。
- [ ] 断言相关页面不再使用字符心形、字符性别和近似评论图标。
- [ ] 先执行并保存 RED 失败证据。

### Task 3: 实现共享视觉组件

**Files:**
- Create: `miniapp/src/components/QianxunCommunityIcons.tsx`
- Test: `miniapp/scripts/test-qianxun-interactions-closure.cjs`

- [ ] 实现男女图标，未知性别不显示。
- [ ] 实现评论、未点赞、已点赞图标与数字对齐。
- [ ] 互动控件保留至少 88rpx 点击区域。

### Task 4: 重构千寻互动数据与页面

**Files:**
- Modify: `miniapp/src/pages/qianxun/interactions.tsx`
- Test: `miniapp/scripts/test-qianxun-interactions-closure.cjs`

- [ ] 评论过、点赞过按互动日期渲染完整动态卡。
- [ ] 浏览记录按浏览日期分组，卡片显示动态发布日期。
- [ ] 浏览记录显示作者性别、正确评论与点赞图标。
- [ ] 解锁过继续使用用户列表形态。
- [ ] 移除占用垂直空间的清空行，将清空动作放入真实更多操作。
- [ ] 对齐头部、主面板、Tab、卡片宽度和上下间距。

### Task 5: 统一关联页面图标和卡片

**Files:**
- Modify: `miniapp/src/pages/qianxun/my-posts.tsx`
- Modify: `miniapp/src/pages/qianxun/post-detail.tsx`
- Modify: `miniapp/src/pages/qianxun/topic.tsx`
- Modify: `miniapp/src/features/qianxun/QianxunZhiyinTab.tsx`

- [ ] 我的动态使用真实评论、点赞图标。
- [ ] 动态详情使用真实评论、点赞图标和状态图标。
- [ ] 话题列表使用真实性别、评论、点赞图标。
- [ ] 知音诚意贴清除 CSS/字符近似图标。

### Task 6: 构建、截图与报告

**Files:**
- Modify: `miniapp/scripts/capture-qianxun-current-ui.cjs`
- Create: `docs/测试文档/千寻互动整体蓝湖还原-testcase.md`
- Create: `docs/测试文档/千寻互动整体蓝湖还原-testreport.md`
- Create: `docs/验收报告/2026-08-05-千寻互动整体-蓝湖还原-acceptance.md`

- [ ] 执行单测、PRD-05 门禁、静态校验与正式构建。
- [ ] 微信运行态覆盖评论过、点赞过、解锁过、浏览记录、我的动态和关联页。
- [ ] 对照蓝湖截图逐项登记差异和还原度。
- [ ] 输出测试报告、截图证据和遗留限制。
