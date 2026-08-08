# 小程序心动、资料与录音蓝湖还原 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复心动空态、编辑资料、主页预览与语音介绍的蓝湖视觉和交互差异，并以微信小程序 390×844 运行态截图完成闭环。

**Architecture:** 继续复用现有关系空态、资料卡片、资料预览和录音管理器，不改变 PRD-01 接口协议。视觉尺寸由蓝湖 750rpx 基线驱动；录音时限继续读取运行时配置，页面只补齐明确的时限展示、完成态和管理入口。

**Tech Stack:** Taro 4、React 18、TypeScript、微信小程序、Node.js 静态门禁、miniprogram-automator。

## Global Constraints

- 设计来源：`miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/03/05/12/46/47/48/49/52/53/55/80/82`。
- 主验收视口：微信小程序 390×844；关键页面还原度不低于 97%。
- 所有按钮、X、播放、认证图标必须是真实可见组件或 OSS 图标，禁止截图热区。
- 录音有效时长保持后端动态配置口径，当前为 10–60 秒，不能在提交链路另写一套限制。
- 保留用户现有未提交改动；未经用户要求不提交、不推送、不发布。

---

### Task 1: 心动空态对齐同城空态

**Files:**
- Modify: `miniapp/src/pages/community/index.tsx`
- Test: `miniapp/scripts/test-miniapp-lanhu-multi-page-closure.cjs`
- Test: `miniapp/scripts/verify-relation-feedback-runtime.cjs`

**Interfaces:**
- Consumes: `miniappOssIcons.qianxunEmptyFollowing`。
- Produces: `RelationStatePanel` 空态顶部留白及稳定验收节点。

- [ ] **Step 1: 写失败门禁**：断言心动空态复用同城人物插画、空态内容使用 `paddingTop: '128rpx'` 且不得 `justifyContent: 'center'`。
- [ ] **Step 2: 验证 RED**：运行 `node scripts/test-miniapp-lanhu-multi-page-closure.cjs`，预期因旧爱心图标和垂直居中失败。
- [ ] **Step 3: 最小实现**：替换空态插画并让空态容器从顶部按 128rpx 排布。
- [ ] **Step 4: 验证 GREEN**：重跑专项门禁并截图心动空态。

### Task 2: 编辑资料与主页预览资料卡片收口

**Files:**
- Modify: `miniapp/src/pages/profile/edit.tsx`
- Modify: `miniapp/src/pages/profile/components/ProfilePreviewPage.tsx`
- Modify: `miniapp/src/constants/ossIcons.ts`（仅在新增正确切图并上传后）
- Test: `miniapp/scripts/test-profile-edit-closure.cjs`
- Test: `miniapp/scripts/test-miniapp-lanhu-multi-page-closure.cjs`

**Interfaces:**
- Consumes: 当前真实头像、标签、认证状态与主页详情模型。
- Produces: 标签编辑入口、正确认证图标布局、资料预览认证徽章和更松的关于我首项间距。

- [ ] **Step 1: 写失败门禁**：断言“我的标签”存在编辑动作；认证三项使用与蓝湖匹配的透明图标；“关于我”到首项至少 28rpx。
- [ ] **Step 2: 验证 RED**：运行资料专项测试，确认旧实现失败。
- [ ] **Step 3: 最小实现**：补编辑入口、修正认证图标与尺寸、扩大关于我标题与见面偏好间距；保持头像和预览共用同一数据源。
- [ ] **Step 4: 验证 GREEN**：重跑专项测试，截图编辑资料基础认证、标签/录音/关于我及主页预览。

### Task 3: 语音介绍时限与完成态 1:1 还原

**Files:**
- Modify: `miniapp/src/pages/profile/edit.tsx`
- Modify: `miniapp/src/utils/voiceRecording.ts`（仅在显示格式需要纯函数时）
- Modify: `miniapp/scripts/capture-profile-edit-closure.cjs`
- Test: `miniapp/scripts/test-profile-edit-closure.cjs`
- Test: `miniapp/scripts/verify-profile-edit-runtime.cjs`

**Interfaces:**
- Consumes: `config.uploadLimits.voiceMinDuration/voiceMaxDuration`、微信 `RecorderManager`。
- Produces: 录制中“当前秒数/最大秒数”提示、到时自动完成、蓝湖 922rpx 底部面板、270×48rpx 已录音条、48rpx X 和管理入口。

- [ ] **Step 1: 写失败门禁**：断言录音时限文案、922rpx 面板、短条/X/管理入口及稳定节点。
- [ ] **Step 2: 验证 RED**：运行资料专项测试，预期因旧 618/548rpx 面板和 86rpx 整行录音条失败。
- [ ] **Step 3: 最小实现**：按 46/47/80 画板重排初始、录制、完成态，继续用动态最大时长驱动 RecorderManager 和计时。
- [ ] **Step 4: 验证 GREEN**：运行静态测试和微信真实录音链路，覆盖录制、完成、播放、删除、保存。

### Task 4: 构建、截图与验收记录

**Files:**
- Create: `docs/验收报告/2026-08-07-心动资料录音蓝湖还原-acceptance.md`
- Create: `docs/验收报告/截图证据/2026-08-07-心动资料录音蓝湖还原/微信运行-390x844/*.png`

**Interfaces:**
- Consumes: 前三项实现和运行态自动化。
- Produces: 差异清单、截图路径、还原度评分和剩余缺口。

- [ ] **Step 1: 运行专项测试与 ESLint**：要求 0 error。
- [ ] **Step 2: 运行 `npm run build:weapp`**：要求构建、页面注册、固定登录及包体门禁全部通过。
- [ ] **Step 3: 执行微信 390×844 截图**：至少覆盖心动空态、编辑资料认证、标签录音关于我、主页预览、录音初始/录制/完成态。
- [ ] **Step 4: 对照蓝湖记录差异并迭代**：关键页面低于 97% 时继续修复。
- [ ] **Step 5: 输出验收报告**：只记录有截图或测试证据的结论。

