# 发布动态图片预览顺畅交互 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development to implement this plan task-by-task.

**Goal:** 移除发布动态图片失败态的“重新上传”入口，为已选图片提供最大 3 倍的受控预览，并避免重复拉起图片选择器。

**Architecture:** 保留现有 `UploadImage[]`、上传接口、草稿与发布协议，仅在 `QianxunComposePage` 内补充选择互斥、失败态展示和独立图片预览层。预览层使用微信原生 `MovableArea`/`MovableView` 手势能力，限制 `scaleMin=1`、`scaleMax=3`，关闭时销毁以复位缩放状态。

**Tech Stack:** React 18、Taro、微信小程序 `MovableArea`/`MovableView`、Node.js 静态门禁、微信开发者工具自动化。

## Global Constraints

- 不修改社区上传接口、发布 payload、草稿数据结构和审核流程。
- 不新增整页截图、透明热区或字符占位图标。
- 不覆盖或还原工作树中其他未提交改动。
- 上传失败只展示“上传失败”，保留删除入口；用户可删除后从现有加图入口重新选择。

---

### Task 1: 锁定交互验收标准

**Files:**
- Modify: `miniapp/scripts/validate-qianxun-topic-demo-closure.mjs`

**Step 1: Write the failing test**

- 断言发布页不再引用 `COMMUNITY_COPY_KEYS.uploadRetry`。
- 断言图片预览使用 `MovableArea`/`MovableView`，缩放区间为 1～3 倍。
- 断言选择图片存在同步互斥锁，避免连续点击重复拉起。

**Step 2: Run test to verify it fails**

Run: `cd miniapp && node scripts/validate-qianxun-topic-demo-closure.mjs`

Expected: FAIL，提示上述交互门禁未满足。

### Task 2: 实现上传与受控预览

**Files:**
- Modify: `miniapp/src/pages/qianxun/compose.tsx`

**Step 1: Write minimal implementation**

- 为 `chooseImages` 增加 `choosingImagesRef`，选择和入队期间忽略重复触发。
- 上传失败层改为不可点击的“上传失败”，不再提供重新上传。
- 成功图片缩略图点击打开大图预览；删除按钮阻止冒泡。
- 新增全屏 `ImagePreview`，支持拖拽和双指缩放，最大 3 倍，提供真实可见关闭按钮。

**Step 2: Run test to verify it passes**

Run: `cd miniapp && node scripts/validate-qianxun-topic-demo-closure.mjs`

Expected: PASS。

### Task 3: 同步规格与交付记录

**Files:**
- Modify: `docs/需求文档/需求文档-正式版/定稿：05-推荐模块（朋友、社区与内容互动）/移动端/页面规格/APP-05_发布动态页.md`
- Create: `docs/技术方案/2026-08-08-发布动态图片预览顺畅交互-蓝湖还原-tcdesign.md`
- Create: `docs/验收报告/2026-08-08-发布动态图片预览顺畅交互-蓝湖还原-acceptance.md`

**Step 1: Update the source of truth**

- 将失败图片操作从“重试或删除”改为“提示失败，可删除后重新选择”。
- 补充图片预览最大 3 倍、关闭后复位的规则。

**Step 2: Record implementation and acceptance evidence**

- 登记设计基线、组件映射、根因、差异闭环、验证结果和截图路径。

### Task 4: 验证运行闭环

**Files:**
- Modify: `miniapp/scripts/verify-topic-list-compose-ui-runtime.cjs`
- Create: `docs/验收报告/截图证据/2026-08-08-发布动态图片预览顺畅交互/微信运行-390x844/*.png`

**Step 1: Run static and targeted checks**

Run: `cd miniapp && node scripts/validate-qianxun-topic-demo-closure.mjs`

Run: `cd miniapp && npx eslint src/pages/qianxun/compose.tsx scripts/validate-qianxun-topic-demo-closure.mjs`

**Step 2: Build the miniapp**

Run: `cd miniapp && npm run build:weapp`

Expected: `Webpack compiled successfully`。

**Step 3: Capture runtime evidence**

Run: `cd miniapp && WX_AUTO_PORT=9438 node scripts/verify-topic-list-compose-ui-runtime.cjs`

Expected: 发布动态页可打开，图片区与预览层关键节点存在并生成运行截图。

**Step 4: Check patch integrity**

Run: `git diff --check`

Expected: 本次修改无空白符错误。
