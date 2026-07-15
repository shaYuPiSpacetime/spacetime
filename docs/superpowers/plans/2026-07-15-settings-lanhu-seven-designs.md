# 设置模块蓝湖七稿 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将蓝湖“设置”组 7 张设计稿还原为可运行的微信小程序设置、关于我们和账号注销闭环。

**Architecture:** 使用 `pages/settings` 子包承载设置首页、关于我们、注销账号和公共内容页；弹窗、勾选和成功提示作为页面状态而非伪造路由。页面数据分别来自设置聚合、公共配置、公告和账号安全接口，纯状态判断放入 `domain/settingsFlow.ts`。

**Tech Stack:** React 18、TypeScript、Taro 4.1.9、SCSS、Node.js 静态门禁、Spring Boot 既有移动端接口。

## Global Constraints

- 设计源为蓝湖项目 `d9c9e50f-fee5-47ca-bd6b-ae05c0d5332b` 的设置组 7 稿，画布 750×1624，对应运行视口 375×812。
- 关键首屏还原度不低于 97%，整体不低于 95%。
- 所有按钮、复选框、弹窗和列表行必须是真实组件并绑定事件。
- 设置聚合、注销状态、冷静期、版本号、合规入口均读取接口，不伪造业务数据。
- Logo 从蓝湖原图按 2x 原样切出，上传 OSS 后仅引用 `ossIcons.ts`。
- 不覆盖工作区已有认证模块改动，不提交或推送代码。

---

### Task 1: 设置运行态领域模型与接口

**Files:**
- Create: `miniapp/src/types/settings.ts`
- Create: `miniapp/src/services/settings.ts`
- Create: `miniapp/src/domain/settingsFlow.ts`
- Test: `miniapp/scripts/test-settings-lanhu-flow.cjs`

**Interfaces:**
- Consumes: `/miniapp/settings/home`、`/miniapp/account/cancel-status`、`/miniapp/account/cancel`、`/miniapp/account/cancel/revoke`、`/miniapp/logout`。
- Produces: `settingsApi`、`resolveCancelSubmitState`、`buildCancelReason`、`isCoolingOff`。

- [ ] **Step 1: 写失败测试**

```js
test('注销原因未选择时按钮禁用，选择后启用', () => {
  assert.equal(resolveCancelSubmitState({ selected: [], detail: '' }).enabled, false)
  assert.equal(resolveCancelSubmitState({ selected: ['OTHER'], detail: '不想用了' }).enabled, true)
})
```

- [ ] **Step 2: 运行测试确认因模块缺失而失败**

Run: `cd miniapp && node --test scripts/test-settings-lanhu-flow.cjs`
Expected: FAIL，提示设置领域模块或页面契约不存在。

- [ ] **Step 3: 实现最小领域模型和接口封装**

```ts
export function resolveCancelSubmitState(input: CancelReasonInput) {
  const reason = buildCancelReason(input)
  return { enabled: reason.length > 0, reason }
}
```

- [ ] **Step 4: 运行专项测试**

Run: `cd miniapp && node --test scripts/test-settings-lanhu-flow.cjs`
Expected: PASS。

### Task 2: 设置首页与退出登录状态

**Files:**
- Create: `miniapp/src/pages/settings/index.tsx`
- Create: `miniapp/src/pages/settings/index.config.ts`
- Create: `miniapp/src/pages/settings/components/SettingsShell.tsx`
- Create: `miniapp/src/pages/settings/components/SettingsDialog.tsx`
- Create: `miniapp/src/pages/settings/settings.scss`
- Modify: `miniapp/src/hooks/useProfile.ts`
- Modify: `miniapp/src/app.config.ts`
- Test: `miniapp/scripts/validate-settings-lanhu.mjs`

**Interfaces:**
- Consumes: `settingsApi.home()`、`useAuthStore.logout()`。
- Produces: 设置首页、退出确认弹窗、设置入口真实导航。

- [ ] **Step 1: 增加设置页结构和路由失败门禁**
- [ ] **Step 2: 运行门禁确认设置入口仍为 toast 而失败**
- [ ] **Step 3: 按蓝湖 750rpx 基线实现列表、底部注销入口和退出弹窗**
- [ ] **Step 4: 运行门禁并构建设置页**

### Task 3: 账号注销页面与三种交互状态

**Files:**
- Create: `miniapp/src/pages/settings/account-cancel.tsx`
- Create: `miniapp/src/pages/settings/account-cancel.config.ts`
- Modify: `miniapp/src/pages/settings/settings.scss`
- Test: `miniapp/scripts/test-settings-lanhu-flow.cjs`

**Interfaces:**
- Consumes: `settingsApi.cancelStatus()`、`settingsApi.applyCancel()`、`settingsApi.revokeCancel()`。
- Produces: 原因默认态、原因点亮态、注销提醒弹窗、提交成功提示和后悔期撤销态。

- [ ] **Step 1: 增加失败测试覆盖原因、协议和冷静期状态**
- [ ] **Step 2: 运行测试观察预期失败**
- [ ] **Step 3: 实现真实复选框、文本框、协议勾选、阻断信息和接口提交**
- [ ] **Step 4: 运行专项测试确认绿灯**

### Task 4: 关于我们和动态内容入口

**Files:**
- Create: `miniapp/src/pages/settings/about.tsx`
- Create: `miniapp/src/pages/settings/about.config.ts`
- Create: `miniapp/src/pages/settings/content.tsx`
- Create: `miniapp/src/pages/settings/content.config.ts`
- Create: `miniapp/src/pages/settings/announcements.tsx`
- Create: `miniapp/src/pages/settings/announcements.config.ts`
- Modify: `miniapp/scripts/upload-miniapp-oss-icons.mjs`
- Modify: `miniapp/src/constants/ossIcons.ts`

**Interfaces:**
- Consumes: 设置聚合 entries、公共配置、公告列表、OSS Logo。
- Produces: 关于我们 1:1 首屏、用户协议/隐私政策/公告栏闭环。

- [ ] **Step 1: 通过可复现脚本提取 256×256 蓝湖 Logo**
- [ ] **Step 2: 原样上传 OSS 并更新客户端清单**
- [ ] **Step 3: 实现关于我们和内容/公告页面**
- [ ] **Step 4: 校验页面不存在透明热区或本地图标混用**

### Task 5: 构建、微信截图和差异闭环

**Files:**
- Create: `docs/验收报告/2026-07-15-设置模块七稿-蓝湖还原-acceptance.md`
- Create: `docs/验收报告/截图证据/2026-07-15-设置模块七稿/`
- Modify: `miniapp/package.json`

**Interfaces:**
- Consumes: 完整设置模块和蓝湖 7 张基线图。
- Produces: 每张设计状态的运行截图、差异记录和评分。

- [x] **Step 1: 把设置专项门禁接入 prebuild**
- [x] **Step 2: 运行专项测试、全量小程序构建和 Page 注册门禁**
- [x] **Step 3: 在微信开发者工具 375×812 依次截图 7 个状态**
- [x] **Step 4: 对照蓝湖逐项修复，关键首屏达到 97% 后更新验收报告**
