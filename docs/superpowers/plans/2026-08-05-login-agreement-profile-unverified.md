# 登录协议层级与我的未认证节点 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复登录协议弹窗被原生 Logo 覆盖的问题，并让未完成核心认证的用户进入“我的”Tab 后严格展示蓝湖未认证节点。

**Architecture:** 登录页在协议弹窗打开时暂停原生视频覆盖链路，改用同坐标普通图片承载 Logo，使遮罩和弹窗处于同一渲染层。认证引导视觉抽为共享 `VerificationEntryView`，千寻入口与“我的”页共同消费；`useProfile` 先读取主页准入、基础资料和自我介绍，只有 `CORE_ALLOWED` 才渲染正常个人中心与请求资产数据。

**Tech Stack:** Taro 4、React 18、TypeScript、微信小程序自定义 TabBar、Node.js `node:test` 静态门禁。

## Global Constraints

- 所有用户可见文案继续读取 PRD-01 运行时文案，不新增前端猜测文案。
- “我的”未认证态必须停留在 `/pages/profile/index`，由真实路由点亮底部“我的”。
- UI 基线为 `登录-弹窗.png`、`未认证.png`、`未认证-填完部分资料.png`，目标微信逻辑视口 `390 × 844`，关键首屏还原度不低于 97%。
- 登录品牌 Logo、认证插画和认证图标继续使用现有 OSS 无损切图，不新增包内/远程混用。
- 当前工作树已有用户未提交改动，本任务不执行 Git 提交、推送或回退其他改动。

---

### Task 1: 建立登录层级与我的未认证回归门禁

**Files:**
- Create: `miniapp/scripts/test-login-modal-profile-unverified.cjs`
- Modify: `miniapp/package.json`

**Interfaces:**
- Consumes: 登录页、我的页、`useProfile` 和认证引导共享组件源码。
- Produces: `npm run test:login-profile-unverified`，并接入 `predev:weapp`、`prebuild:weapp`。

- [ ] **Step 1: 写失败测试**

```js
test('协议弹窗打开时原生视频和 CoverView Logo 退出覆盖层', () => {
  assert.match(login, /hidden=\{showDialog\}/)
  assert.match(login, /!videoUnavailable && !showDialog/)
  assert.match(login, /showDialog && \([\s\S]*login-brand-logo--dialog/)
})

test('未完成核心认证时我的路由渲染共享未认证节点', () => {
  assert.match(profile, /data\.accessStatus\?\.coreAccessStatus !== 'CORE_ALLOWED'/)
  assert.match(profile, /<VerificationEntryView/)
  assert.match(verificationEntry, /data-role="profile-unverified"/)
  assert.match(profileHook, /getBasicProfile\(\)/)
  assert.match(profileHook, /getIntroduction\(\)/)
})
```

- [ ] **Step 2: 运行测试确认红灯**

Run: `cd miniapp && node --test scripts/test-login-modal-profile-unverified.cjs`

Expected: FAIL，明确缺少协议弹窗同层 Logo 和共享 `VerificationEntryView`。

- [ ] **Step 3: 接入构建门禁**

```json
"test:login-profile-unverified": "node --test scripts/test-login-modal-profile-unverified.cjs"
```

- [ ] **Step 4: 保留红灯证据后进入实现**

Run: `cd miniapp && npm run test:login-profile-unverified`

Expected: 仍为相同业务断言失败，不得因脚本错误或路径错误失败。

### Task 2: 修复登录协议弹窗的原生层覆盖

**Files:**
- Modify: `miniapp/src/pages/login/index.tsx`
- Test: `miniapp/scripts/test-login-modal-profile-unverified.cjs`

**Interfaces:**
- Consumes: `showDialog`、`videoUnavailable`、`miniappOssIcons.loginBrand`。
- Produces: 协议弹窗打开时只保留普通层 Logo，关闭后恢复视频原生覆盖 Logo。

- [ ] **Step 1: 让协议弹窗期间暂停原生视频层**

```tsx
<Video
  hidden={showDialog}
  className="login-scene-video"
  ...
/>
```

- [ ] **Step 2: 协议弹窗期间替换原生 Logo 图层**

```tsx
{!videoUnavailable && !showDialog && (
  <CoverView className="login-brand-logo">...</CoverView>
)}
{showDialog && (
  <Image
    className="login-brand-logo login-brand-logo--dialog"
    src={miniappOssIcons.loginBrand}
    mode="aspectFit"
    style={{ position: 'absolute', left: '95rpx', top: '300rpx', width: '560rpx', height: '260rpx', zIndex: 2 }}
  />
)}
```

- [ ] **Step 3: 运行专项测试确认登录层级绿灯**

Run: `cd miniapp && npm run test:login-profile-unverified`

Expected: 登录层级用例 PASS；我的未认证用例仍 FAIL。

### Task 3: 共享未认证 UI 并在我的路由按准入状态渲染

**Files:**
- Create: `miniapp/src/features/verification/VerificationEntryView.tsx`
- Modify: `miniapp/src/pages/index/index.tsx`
- Modify: `miniapp/src/pages/profile/index.tsx`
- Modify: `miniapp/src/hooks/useProfile.ts`
- Modify: `miniapp/scripts/validate-verification-profile-ui.mjs`
- Modify: `miniapp/scripts/test-profile-edit-closure.cjs`
- Test: `miniapp/scripts/test-login-modal-profile-unverified.cjs`

**Interfaces:**
- Consumes: `copy(key)`、`BasicProfile`、`VerificationStatus`、`OpenTextDetail`、`AccessStatus`、`resolveVerificationOnboardingRoute`。
- Produces: `VerificationEntryView`，支持 `loading`、`error`、`initial`、`partial` 四态；`useProfile.data` 增加 `accessStatus`、`basicProfile`、`verification`、`introduction`。

- [ ] **Step 1: 抽取蓝湖未认证共享视图**

```tsx
export interface VerificationEntryViewProps {
  unreadCount: number
  loading: boolean
  error: string
  hasPartialProfile: boolean
  checklist: { basic: boolean; avatarIntro: boolean; triple: boolean }
  copy: (key: string) => string
  onContinue: () => void
  onLater: () => void
  onRetry: () => void
  role?: 'index-unverified' | 'profile-unverified'
}
```

共享视图保持蓝湖基线：主标题 `48rpx/67rpx`、按钮 `top: 1098rpx`、圆角 `27rpx`、部分资料卡 `700 × 168rpx`，所有图标使用现有 OSS 常量。

- [ ] **Step 2: 千寻入口改用共享视图**

```tsx
return (
  <VerificationEntryView
    role="index-unverified"
    unreadCount={unreadCount}
    loading={loading}
    error={entryError}
    hasPartialProfile={hasPartialProfile}
    checklist={checklist}
    copy={copy}
    onContinue={() => void continueFlow()}
    onLater={() => void enterAvailableArea()}
    onRetry={() => void loadIndex()}
  />
)
```

- [ ] **Step 3: 我的数据先判准入再加载资产**

```ts
const [homeResult, basicResult, introductionResult] = await Promise.all([
  prd01Api.getHomeDetail(),
  prd01Api.getBasicProfile(),
  prd01Api.getIntroduction(),
])
useAuthStore.getState().setAccessStatus(homeResult.accessStatus)

if (homeResult.accessStatus.coreAccessStatus === 'CORE_ALLOWED') {
  const [status, balance] = await Promise.all([getVipStatus(), getCoinBalance()])
  // 仅准入用户加载正常个人中心资产。
}
```

- [ ] **Step 4: 我的路由渲染未认证节点并保持 Tab 点亮**

```tsx
if (data.accessStatus?.coreAccessStatus !== 'CORE_ALLOWED') {
  return (
    <VerificationEntryView
      role="profile-unverified"
      ...
    />
  )
}
```

不调用 `redirectTo`、`reLaunch` 或 `navigateTo` 替换当前 Tab；自定义 TabBar 继续根据真实 `/pages/profile/index` 点亮“我的”。

- [ ] **Step 5: 更新既有蓝湖静态门禁到共享组件**

将按钮圆角、认证插画和卡片几何断言从仅扫描 `pages/index/index.tsx` 改为扫描 `features/verification/VerificationEntryView.tsx`，同时保留千寻与我的均接入共享组件的断言。

- [ ] **Step 6: 运行专项与既有认证测试确认绿灯**

Run: `cd miniapp && npm run test:login-profile-unverified && node --test scripts/test-verification-onboarding-flow.cjs scripts/test-profile-edit-closure.cjs`

Expected: 全部 PASS，零失败。

### Task 4: 截图差异、全量验证与验收文档

**Files:**
- Create: `docs/技术方案/2026-08-05-登录协议与我的未认证-蓝湖还原-tcdesign.md`
- Create: `docs/验收报告/2026-08-05-登录协议与我的未认证-蓝湖还原-acceptance.md`
- Create: `docs/验收报告/截图证据/2026-08-05-登录协议与我的未认证-蓝湖还原/*`

**Interfaces:**
- Consumes: 蓝湖基线、微信运行页面和自动化节点。
- Produces: 登录协议弹窗、我的未认证初始态、我的未认证部分资料态截图与评分。

- [ ] **Step 1: 执行目标文件 ESLint**

Run: `cd miniapp && npx eslint src/pages/login/index.tsx src/features/verification/VerificationEntryView.tsx src/pages/index/index.tsx src/pages/profile/index.tsx src/hooks/useProfile.ts scripts/test-login-modal-profile-unverified.cjs`

Expected: exit 0，零错误。

- [ ] **Step 2: 执行全量小程序构建**

Run: `cd miniapp && npm run build:weapp`

Expected: 所有 prebuild 门禁、Webpack、页面注册和包体检查通过。

- [ ] **Step 3: 微信运行截图并核对**

运行态至少覆盖：

1. `pages/login/index?variant=dialog`：遮罩压住 Logo，Logo 不穿透弹窗。
2. `/pages/profile/index` + 无认证资料：显示初始未认证稿，底部“我的”点亮。
3. `/pages/profile/index` + 部分资料：显示三卡进度稿，底部“我的”点亮。

- [ ] **Step 4: 输出差异与评分**

验收报告按结构、几何、字体色彩、素材、交互层级、安全区六维评分；关键首屏不足 97% 时继续修复，不得交付。
