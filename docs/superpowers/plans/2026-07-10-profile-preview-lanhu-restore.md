# 主页预览蓝湖高还原 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按蓝湖“主页预览”画板将微信小程序页面还原到关键首屏 >= 97%、整体 >= 95%。

**Architecture:** 保留编辑资料页内的本地 Tab 切换，重建独立 `ProfilePreviewPage` 视觉层；照片使用蓝湖无损切图，文字、导航、标签、认证和分享操作使用真实 Taro 组件。通过静态设计门禁、H5 截图差异和微信构建组成验收闭环。

**Tech Stack:** React 18、TypeScript、Taro 4、微信小程序、Node.js 20、ESLint、Playwright/浏览器截图。

## Global Constraints

- 设计画布固定为 `750 x 6803`，Taro 以 `rpx` 一比一映射。
- 禁止把导航、文字、按钮和标签烘焙进整页图片。
- 新增非底部图标必须使用项目 OSS 规则；已有认证图标复用 `miniappOssIcons`。
- 字体采用 PingFang SC，字距为 `0`，严格映射蓝湖字号、字重和行高。
- 不修改编辑资料业务数据和既有固定登录逻辑。

---

### Task 1: 建立蓝湖视觉回归门禁

**Files:**
- Create: `miniapp/scripts/validate-profile-preview-lanhu.mjs`
- Modify: `miniapp/package.json`

**Interfaces:**
- Consumes: 蓝湖 `750 x 6803` 设计基线。
- Produces: 可重复执行的静态视觉约束门禁。

- [ ] **Step 1: 写失败门禁**

校验主图 `700 x 828`、照片 `700 x 896`、卡片圆角 `32`、标题 `28/40`、正确文案和独立相册切图引用。

- [ ] **Step 2: 运行门禁并确认失败**

Run: `cd miniapp && node scripts/validate-profile-preview-lanhu.mjs`

Expected: FAIL，指出现有 `920rpx` 主图、`700rpx` 相册图或错误素材引用。

- [ ] **Step 3: 将门禁接入微信开发与构建前置脚本**

在 `predev:weapp` 和 `prebuild:weapp` 追加该脚本。

### Task 2: 切出并接入蓝湖人物照片

**Files:**
- Create: `miniapp/src/assets/lanhu/profile/profile-preview-photo.png`

**Interfaces:**
- Consumes: `蓝湖基线-主页预览-1500x13606.png`。
- Produces: `2x`、无损 PNG 人物相册切图。

- [ ] **Step 1: 从第一张相册卡无损裁切 `1400 x 1792` 源图**
- [ ] **Step 2: 校验像素尺寸和文件格式**
- [ ] **Step 3: 在组件中以 `700 x 896rpx`、`aspectFill`、`32rpx` 圆角重复展示四次**

### Task 3: 重建主页预览和顶部导航

**Files:**
- Modify: `miniapp/src/pages/profile/components/ProfilePreviewPage.tsx`
- Modify: `miniapp/src/components/ProfilePreviewTopNav.tsx`

**Interfaces:**
- Consumes: `nickname`、`onBack`、`onEdit` 与蓝湖人物切图。
- Produces: 保持原组件 Props 不变的高还原页面。

- [ ] **Step 1: 按蓝湖顺序和尺寸重建主图、信息卡、标签、自我介绍**
- [ ] **Step 2: 重建四张相册图、认证、歌曲和 MBTI 区**
- [ ] **Step 3: 映射顶部激活/未激活 Tab 字体和下划线**
- [ ] **Step 4: 运行静态门禁至通过**

### Task 4: 截图差异闭环与交付

**Files:**
- Create: `docs/验收报告/2026-07-10-主页预览-蓝湖还原-acceptance.md`
- Create: `docs/验收报告/截图证据/2026-07-10-主页预览/*`

**Interfaces:**
- Consumes: 蓝湖基线、H5 运行截图、微信构建产物。
- Produces: 差异清单、修复记录和量化评分。

- [ ] **Step 1: 运行 ESLint 与微信小程序构建**
- [ ] **Step 2: 截取 `375 x 812` 首屏与全页，补充 `414 x 896` 首屏**
- [ ] **Step 3: 按六维评分矩阵列差异并修复**
- [ ] **Step 4: 更新验收报告，只有达到门禁后才标记完成**
