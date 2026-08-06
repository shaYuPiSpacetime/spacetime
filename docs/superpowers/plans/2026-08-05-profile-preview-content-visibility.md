# 主页预览真实内容显隐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 主页预览只展示用户真实填写的数据和真实相册图片，任何空内容不再生成占位卡片或空白大图。

**Architecture:** 保留顶部主图与基础身份卡作为页面固定骨架；新增纯领域映射统一清理标签、文本、相册与认证状态，再由 `ProfilePreviewPage` 按蓝湖既定顺序条件渲染可选模块。相册最多沿用蓝湖四个大图位置，但只消费实际存在的图片。

**Tech Stack:** React 18、TypeScript、Taro 4、微信小程序、Node test runner。

## Global Constraints

- 设计来源：用户截图与 `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images/03-主页预览.webp`。
- 顶部主图、头像、导航与基础身份卡保持现有蓝湖几何规格。
- 标签、自我介绍、认证、歌曲没有有效内容时连同标题和白卡一起隐藏。
- 相册只展示非空 URL，不绘制“暂未添加照片”占位卡。
- 认证卡仅在至少一项认证通过时展示；顶部认证数量仍保留。
- 继续隐藏 MBTI；不新增假数据、默认文案或截图伪交互。
- 不提交、不推送现有共享脏工作区。

---

### Task 1: 建立可选内容显隐领域模型

**Files:**
- Create: `miniapp/src/domain/profilePreviewVisibility.ts`
- Modify: `miniapp/scripts/test-profile-edit-closure.cjs`

**Interfaces:**
- Consumes: 标签数组、介绍文本、相册 URL、认证通过状态、歌曲文本。
- Produces: `buildProfilePreviewVisibility(input)`，返回清理后的可见内容与 `showCertification`。

- [ ] **Step 1: 写失败测试**

```js
const empty = buildProfilePreviewVisibility({
  tags: [], introduction: '  ', photos: ['', '  '],
  certifications: [{ passed: false }], favoriteSong: '',
})
assert.deepEqual(empty.tags, [])
assert.deepEqual(empty.photos, [])
assert.equal(empty.introduction, '')
assert.equal(empty.showCertification, false)
assert.equal(empty.favoriteSong, '')
```

- [ ] **Step 2: 运行 `node --test --test-name-pattern='主页预览空内容' scripts/test-profile-edit-closure.cjs`，确认因领域模型不存在而失败。**
- [ ] **Step 3: 实现最小领域函数，过滤空标签、空文本和空 URL，相册最多保留四张。**
- [ ] **Step 4: 重跑目标测试，确认通过。**

### Task 2: 主页预览按真实数据条件渲染

**Files:**
- Modify: `miniapp/src/pages/profile/components/ProfilePreviewPage.tsx`
- Modify: `miniapp/scripts/validate-profile-preview-lanhu.mjs`

**Interfaces:**
- Consumes: `buildProfilePreviewVisibility(model)`。
- Produces: 动态高度页面；固定骨架之外只渲染有内容的模块。

- [ ] **Step 1: 在失败测试中约束不得出现“暂未添加标签、暂未填写自我介绍、暂未添加照片、暂未添加喜欢的歌曲”。**
- [ ] **Step 2: 条件渲染标签、自介、认证、歌曲与四个真实图片位置；空项返回 `null`。**
- [ ] **Step 3: 将固定 `5900rpx` 页面最小高度改为视口最小高度，避免隐藏模块后遗留超长空白。**
- [ ] **Step 4: 更新蓝湖静态门禁，使其验证真实图片过滤和空模块隐藏，不再要求四个无条件卡位。**

### Task 3: 回归、构建与验收

**Files:**
- Modify: `docs/测试文档/编辑资料蓝湖还原-testcase.md`
- Modify: `docs/测试文档/编辑资料蓝湖还原-testreport.md`
- Modify: `docs/验收报告/2026-08-05-编辑资料整体-蓝湖还原-acceptance.md`

**Interfaces:**
- Produces: 空内容行为、完整回归和正式发布产物证据。

- [ ] **Step 1: 执行编辑资料专项测试、主页预览蓝湖门禁与 UI 静态门禁。**
- [ ] **Step 2: 生成微信 390×844 主页预览空内容截图，确认没有空白卡和占位文案。**
- [ ] **Step 3: 执行无固定账号的 `npm run build:weapp`，确认页面注册、启动页和包体门禁通过。**
- [ ] **Step 4: 更新测试与验收文档，记录设计基线、动态内容差异和截图证据。**
