# 千寻社区互动闭环实施计划

> 执行日期：2026-08-05
> 范围：小程序千寻「成家 / 知音」及社区发布后端

## 目标

闭环修复动态发布异常、关注按钮缺少“+”、同城动态被强制关联话题、热门社区话题无法滑动、诚意贴操作图标未垂直居中、悦目心动缺少明确反馈，并对成家和知音主链路执行完整回归。

## 已确认根因

1. 发布页 `handlePublish` 和 `canPublish` 强制要求 `topicId`，客户端服务方法也把 `topicId` 声明为必填。
2. 后端 `CommunityPostCreateReq.topicId` 使用 `@NotNull`，`validatePostRequest` 无条件校验话题；持久化时还会在话题为空时读取 `topicName`。
3. 生产日志请求 `2c43aee6833b44b1b1bc626ff7203ff6`、`9db4646a2cc8492e991172f1a4eb9ca8`、`a417d18b6015437b90e2c550d362be2f` 均为多图异步审核 trace 拼入 `machine_code` 后超过数据库 `VARCHAR(64)`，导致发布事务回滚。
4. 成家动态和诚意贴卡片未关注态只显示“关注”，与设计反馈不符。
5. 热门社区话题底部绘制了分页指示点，但内容是静态 `View`，没有 `Swiper` 和页码状态。
6. 诚意贴底部评论/心动使用字体字符，字形基线不一致；悦目未心动与已心动态均显示同一个实心爱心，接口成功后几乎没有可感知变化，也没有防重复提交状态。

## 执行任务

### 任务 1：先补失败测试（RED）

- 修改 `backend/src/test/java/com/spacetime/miniapp/service/CommunityServiceImplTest.java`
  - 新增普通动态不关联话题仍可发布。
  - 新增多图异步审核 trace 超过 64 字符时，帖子和审计 provider code 可安全持久化，同时媒体任务保留完整 trace。
- 新增 `miniapp/scripts/validate-qianxun-community-interaction-closure.mjs`
  - 断言话题可选、`+关注`、热门话题 `Swiper`、诚意贴结构化图标、悦目心动 loading/反馈状态。
- 运行定向测试并确认按预期失败。

### 任务 2：修复动态发布前后端契约（GREEN）

- 修改 `miniapp/src/pages/qianxun/compose.tsx`
  - 移除发布前强制选话题；话题仍保留为可选增强项。
  - 图片选择使用微信压缩图，降低超过运行配置大小上限的概率。
- 修改 `miniapp/src/services/community.ts`
  - `publishCommunityPost` 的 `topicId` 改为可选。
- 修改 `backend/src/main/java/com/spacetime/miniapp/dto/request/CommunityPostCreateReq.java`
  - 话题改为可选。
- 修改 `backend/src/main/java/com/spacetime/miniapp/service/impl/CommunityServiceImpl.java`
  - 仅在传入话题时校验；话题快照空值安全。
  - 超长异步审核 trace 在帖子和审计记录中写入稳定短码，完整 trace 继续写媒体审核任务表。

### 任务 3：修复成家与知音交互和视觉

- 修改 `miniapp/src/features/qianxun/QianxunFamilyPage.tsx`
  - 未关注态显示“+ 关注”。
- 修改 `miniapp/src/features/qianxun/QianxunTopicSpotlight.tsx`
  - 话题卡改为真实可左右滑动的 `Swiper`，指示点跟随当前页。
- 修改 `miniapp/src/features/qianxun/QianxunZhiyinTab.tsx`
  - 诚意贴未关注态显示“+ 关注”。
  - 评论、心动改为结构化可见图标并统一 flex 垂直居中。
  - 悦目心动增加提交中状态、防重复点击、成功后明显的实心/空心状态和轻提示。

### 任务 4：测试文档与完整验证

- 更新 `docs/测试文档/社区互动-PRD05-testcase.md`。
- 更新 `docs/测试文档/社区互动-PRD05-testreport.md`。
- 执行：
  - 后端定向 JUnit 与 Java 21 全量测试。
  - 小程序新增闭环门禁、既有 PRD-05 / 千寻 / 原生导航门禁。
  - 小程序 TypeScript / ESLint（若项目脚本提供）与 `build:weapp`。
  - 微信开发者工具运行态：成家关注/同城/热门滑动、知音悦目心动/诚意贴、无话题发布请求。
  - 发布后生产接口和日志复验，确认无新的发布事务异常。

## 完成标准

- 无话题的普通动态可成功提交，带话题发布不回归。
- 多图发布不再因 `machine_code` 超长回滚。
- 关注按钮、话题滑动、诚意贴图标和悦目心动均有真实交互与清晰状态反馈。
- 成家、知音全部 P0/P1 用例通过；测试报告记录命令、数量和运行态证据。
