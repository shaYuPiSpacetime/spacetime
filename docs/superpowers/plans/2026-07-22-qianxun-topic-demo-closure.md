# 千寻话题与消息入口 Demo 闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按蓝湖 1:1 补齐千寻热门话题板块、社区话题列表、话题详情与发布回流闭环，修正消息页悄悄话/私信入口图标，并提供正式前后端话题接口。

**Architecture:** 话题数据由小程序后端 `CommunityController -> CommunityService -> CommunityServiceImpl -> DAO` 提供，前端统一通过 `services/community.ts` 消费。热门页只负责话题聚合入口；话题列表和详情放入既有千寻分包，复用社区动态卡片的交互语义，同时保留蓝湖独立视觉。静态门禁覆盖路由、接口、交互和素材来源，运行截图按页面组逐页验收。

**Tech Stack:** Java 21、Spring Boot 3.4、MyBatis-Plus、JUnit 5/Mockito、Taro 4、React 18、TypeScript、SCSS、微信小程序分包、Playwright/H5 截图。

## Global Constraints

- 小程序主包必须小于 2MiB，话题列表和详情继续放在 `pages/qianxun` 分包。
- 微信原生胶囊不在业务代码中绘制；返回箭头复用 `NativeNavigation`。
- 交互控件必须由真实 `View/Text/Image/Input/Button` 组成，禁止整页截图、透明热区或 `opacity: 0` 冒充交互。
- 非底部静态图标和话题视觉素材必须通过 OSS URL 使用；源码、文档和日志不得出现凭证。
- 当前工作树包含用户已有修改，禁止回滚、覆盖或自动提交无关变更。
- 默认视口 375×812；关键首屏目标还原度不低于 97%，整体不低于 95%。

---

### Task 1: 建立话题接口契约与后端测试

**Files:**
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/CommunityTopicCardVO.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/CommunityTopicDetailVO.java`
- Create: `backend/src/main/java/com/spacetime/miniapp/dto/response/CommunityTopicHomeVO.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/controller/CommunityController.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/CommunityService.java`
- Modify: `backend/src/main/java/com/spacetime/miniapp/service/impl/CommunityServiceImpl.java`
- Test: `backend/src/test/java/com/spacetime/miniapp/service/CommunityServiceImplTest.java`

**Interfaces:**
- Produces: `GET /miniapp/community/topics/home -> R<CommunityTopicHomeVO>`。
- Produces: `GET /miniapp/community/topics?page=1&size=10 -> R<Page<CommunityTopicCardVO>>`。
- Produces: `GET /miniapp/community/topics/{id} -> R<CommunityTopicDetailVO>`。
- Produces: `GET /miniapp/community/topics/{id}/posts?sort=HOT|LATEST&page=1&size=10 -> R<Page<CommunityPostCardVO>>`。

- [ ] **Step 1: 写失败测试**：在 `CommunityServiceImplTest` 增加“热门话题聚合返回主话题与四个关联话题”“话题详情统计动态数和参与人数”“话题动态按 HOT/LATEST 排序”三个测试，断言真实 VO 字段和 DAO 查询结果。
- [ ] **Step 2: 验证 RED**：运行 `cd backend && JAVA_HOME=/Users/peter/Library/Java/JavaVirtualMachines/openjdk-22/Contents/Home mvn -Dtest=CommunityServiceImplTest test`，预期因接口和 VO 尚不存在而编译失败。
- [ ] **Step 3: 最小实现**：新增 VO、Controller 路由和 Service 方法；只读取启用的 `community_topic` 字典与已发布动态，`description` 来自字典备注，空封面由前端 OSS 兜底，不新增数据库字段。
- [ ] **Step 4: 验证 GREEN**：重复运行指定测试，预期 0 failure、0 error。
- [ ] **Step 5: 回归检查**：运行 `git diff --check`，确认未修改 `admin/` 且 Controller 返回精确 `R<T>`。

### Task 2: 热门页话题板块与话题列表闭环

**Files:**
- Create: `miniapp/src/features/qianxun/QianxunTopicSpotlight.tsx`
- Create: `miniapp/src/features/qianxun/QianxunTopicSpotlight.scss`
- Create: `miniapp/src/pages/qianxun/topics.tsx`
- Create: `miniapp/src/pages/qianxun/topics.scss`
- Modify: `miniapp/src/features/qianxun/QianxunFamilyPage.tsx`
- Modify: `miniapp/src/services/community.ts`
- Modify: `miniapp/src/app.config.ts`
- Test: `miniapp/scripts/validate-qianxun-topic-demo-closure.mjs`

**Interfaces:**
- Consumes: `getCommunityTopicHome()`、`getCommunityTopics(page,size)`。
- Produces: `QianxunTopicSpotlight`，仅在 `activeTab === 'HOT'` 时位于动态列表首部。
- Produces: `/pages/qianxun/topics` 分包路由，卡片点击进入 `/pages/qianxun/topic?topicId={id}`。

- [ ] **Step 1: 写失败门禁**：断言热门 feed 包含真实话题组件、全部话题跳转、主/关联话题跳转、`topics` 路由在千寻分包、列表具备加载/空态/错误重试。
- [ ] **Step 2: 验证 RED**：运行 `cd miniapp && node scripts/validate-qianxun-topic-demo-closure.mjs`，预期报“热门页缺少社区话题板块”。
- [ ] **Step 3: 最小实现**：按蓝湖 `cb77f45b` 构建 700rpx 白色圆角话题板块，包含“社区话题/全部话题”、主话题预览、浏览头像组、四个关联话题及轮播指示；按 `cb525ef2` 构建社区话题列表。
- [ ] **Step 4: 交互实现**：主话题、四个关联话题、全部话题、列表卡片均绑定可见组件点击事件；接口失败显示可点击重试，不吞异常。
- [ ] **Step 5: 验证 GREEN**：运行话题门禁和相关 ESLint，预期均通过。

### Task 3: 话题详情与参与发布回流闭环

**Files:**
- Modify: `miniapp/src/pages/qianxun/topic.tsx`
- Create: `miniapp/src/pages/qianxun/topic.scss`
- Modify: `miniapp/src/pages/qianxun/compose.tsx`
- Test: `miniapp/scripts/validate-qianxun-topic-demo-closure.mjs`

**Interfaces:**
- Consumes: `getCommunityTopicDetail(topicId)`、`getCommunityTopicPosts(topicId,sort,page,size)`。
- Produces: 话题详情 `HOT/LATEST` 切换、动态详情、作者主页、私信、评论、点赞、参与发布。
- Produces: `compose?topicId={id}&topicName={name}`，发布成功后返回并刷新话题详情。

- [ ] **Step 1: 扩展失败门禁**：断言详情不再从 config 猜话题、不在前端对当前页伪排序，且所有蓝湖可见操作均有真实事件。
- [ ] **Step 2: 验证 RED**：运行门禁，预期因旧详情仍调用 `getCommunityConfig()` 和本地排序而失败。
- [ ] **Step 3: 最小实现**：按蓝湖 `1e1a7cd8` 实现头图、名称、参与/动态统计、描述、圆角内容面板、热门/最新、动态卡片和固定“参与话题”按钮。
- [ ] **Step 4: 闭环交互**：排序触发服务端重新加载；动态卡片的作者、私信、评论、点赞、更多和图片预览可用；发布页保留传入话题并成功回流刷新。
- [ ] **Step 5: 验证 GREEN**：门禁、ESLint 和 H5 交互脚本通过。

### Task 4: 修正悄悄话/私信入口图标并巡检千寻交互

**Files:**
- Modify: `miniapp/src/pages/chat/index.tsx`
- Modify: `miniapp/src/assets/lanhu/message/manifest.json`
- Modify: `miniapp/scripts/upload-miniapp-oss-icons.mjs`
- Modify: `miniapp/src/constants/ossIcons.ts`（由上传脚本生成）
- Modify: `miniapp/scripts/validate-message-18-lanhu.mjs`
- Modify: `miniapp/scripts/validate-qianxun-topic-demo-closure.mjs`

**Interfaces:**
- Produces: 与蓝湖 `626cd513` 一致的 YO 与私信气泡可见图标；保持入口卡片本身为真实点击组件。
- Produces: 千寻交互门禁，覆盖一级/二级 Tab、发布、动态详情、话题、关注、点赞、评论、举报、分享、空态 CTA 和返回。

- [ ] **Step 1: 根因测试**：对比蓝湖源图、本地无损 PNG、OSS 文件哈希和运行态尺寸；门禁禁止重复 `mode`、拉伸比例和错误素材键。
- [ ] **Step 2: 验证 RED**：运行消息门禁，预期当前入口图标渲染约束不满足新增断言。
- [ ] **Step 3: 最小修复**：复用或重新无损裁切蓝湖 2x 源图，执行 `npm run assets:upload-icons`；入口使用正确 `aspectFit/scaleToFill` 与设计比例，不引入包内运行时图标。
- [ ] **Step 4: 千寻交互巡检**：将无效点击、错误路由参数和没有反馈的可见控件修复为真实跳转、状态切换、弹窗或明确 toast。
- [ ] **Step 5: 验证 GREEN**：消息门禁、千寻全交互门禁和相关 ESLint 通过。

### Task 5: 截图差异、分包和完整验收

**Files:**
- Create: `docs/技术方案/2026-07-22-千寻话题与消息入口-蓝湖还原-tcdesign.md`
- Create: `docs/验收报告/2026-07-22-千寻话题与消息入口-蓝湖还原-acceptance.md`
- Create: `docs/验收报告/截图证据/2026-07-22-千寻话题与消息入口/`

**Interfaces:**
- Consumes: 蓝湖 `cb77f45b`、`cb525ef2`、`1e1a7cd8`、`626cd513`。
- Produces: 375×812 默认态、关键交互态、空态/错误态截图和逐页评分。

- [ ] **Step 1: 构建 H5 并逐页截图**：热门、话题列表、话题详情热门、话题详情最新、消息入口分别截图；每页先列差异再修正。
- [ ] **Step 2: 运行后端测试**：指定 `CommunityServiceImplTest` 及完整后端 `mvn test`，记录 failure/error 数。
- [ ] **Step 3: 运行小程序完整构建**：`cd miniapp && npm run build:weapp:dev`，记录 72+ 页面注册、主包、千寻分包与总包体积。
- [ ] **Step 4: 完成验收报告**：按结构、尺寸、视觉、素材、交互、安全区六维评分；关键首屏低于 97% 时继续修复。
- [ ] **Step 5: 最终差异检查**：运行 `git diff --check`，复核只保留本任务和用户原有修改，不提交、不回滚无关内容。

