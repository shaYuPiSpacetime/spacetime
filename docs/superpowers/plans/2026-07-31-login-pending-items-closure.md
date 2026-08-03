# 登录待处理项闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将指定 MP4 作为小程序登录背景，并闭环腾讯表格中验证码提示、登录图标、底部按钮、协议确认和首登默认值按钮状态问题。

**Architecture:** 登录视频保持原始字节上传 OSS，客户端只保存 HTTPS 地址，避免约 0.96MiB 视频进入主包；本地场景图作为首帧与加载失败兜底。手机号错误文案下沉到纯函数，底部圆形按钮抽成登录链路共享组件，入口页与资料页只负责各自状态和导航。

**Tech Stack:** Taro 4.1.9、React 18、TypeScript 5.6、微信小程序 Video/Image/View、Node.js 内置测试、阿里云 OSS REST 签名上传。

## Global Constraints

- 所有用户可见文案、注释和交付说明使用中文。
- 视频必须远程加载，不得进入小程序主包；上传过程只读取 `backend/.env.local` 的 `DEV_OSS_*`，不得输出密钥。
- 视频保持原始 MP4 字节，不压缩、不转码；自动播放必须静音、循环、隐藏控制条，并提供本地静态兜底图。
- 登录方式、输入框、协议、弹窗和底部按钮必须使用真实组件并绑定真实事件，禁止透明热区和整页截图交互。
- 登录链路可点击区域不小于 88rpx；禁用态必须阻止提交，错误态必须给出可恢复文案。
- 保留工作区现有未提交改动；本任务不自动提交或推送 Git。

---

### Task 1: 建立登录待处理项回归门禁

**Files:**
- Create: `miniapp/scripts/test-login-pending-items-closure.cjs`
- Modify: `miniapp/package.json`

**Interfaces:**
- Consumes: `src/pages/login/index.tsx`、`phone.tsx`、`age.tsx` 和共享按钮源码。
- Produces: `npm run validate:login-closure`，并接入 `predev:weapp`、`prebuild:weapp`。

- [x] **Step 1: 写失败测试**

```js
test('登录背景使用远程静音循环视频并保留兜底图', () => {
  assert.match(login, /<Video/)
  assert.match(login, /autoplay/)
  assert.match(login, /muted/)
  assert.match(login, /loop/)
  assert.match(login, /loginSceneBg/)
})
```

- [x] **Step 2: 运行测试确认红灯**

Run: `cd miniapp && node --test scripts/test-login-pending-items-closure.cjs`

Expected: FAIL，提示登录页缺少 `Video`、错误文案解析器或共享底部按钮。

- [x] **Step 3: 将门禁接入构建链路**

```json
{
  "validate:login-closure": "node --test scripts/test-login-pending-items-closure.cjs"
}
```

- [x] **Step 4: 在功能实现前保持红灯**

Run: `cd miniapp && npm run validate:login-closure`

Expected: FAIL，证明测试能捕获当前缺陷。

### Task 2: 原样上传登录背景视频并实现加载兜底

**Files:**
- Create: `miniapp/scripts/upload-login-background-video.mjs`
- Create: `miniapp/src/constants/ossMedia.ts`
- Modify: `miniapp/src/pages/login/index.tsx`
- Modify: `miniapp/scripts/validate-miniapp-release-startup.mjs`

**Interfaces:**
- Consumes: CLI 参数中的 MP4 路径和 `backend/.env.local` 的 OSS 配置。
- Produces: `miniappOssMedia.loginBackgroundVideo: string` 及登录页远程背景视频。

- [x] **Step 1: 增加只上传原字节的 OSS 脚本**

```js
const sha256 = createHash('sha256').update(body).digest('hex')
const objectKey = `miniapp/media/${sha256.slice(0, 16)}/login-background.mp4`
await uploadOriginalBytes({ objectKey, body, mimeType: 'video/mp4' })
```

- [x] **Step 2: 上传并验证公网资源**

Run: `cd miniapp && node scripts/upload-login-background-video.mjs "/absolute/path/25116b92323d422cfe632683a6667c4d.mp4"`

Expected: 输出一个不带签名参数的 HTTPS OSS 地址，公网 HEAD 返回 `video/mp4`，长度为 `1011561` 字节。

- [x] **Step 3: 登录页接入视频和静态兜底**

```tsx
<Image src={loginSceneBg} mode="aspectFill" className="login-scene-media" />
{!videoUnavailable && (
  <Video src={miniappOssMedia.loginBackgroundVideo} autoplay loop muted controls={false} objectFit="cover" onError={() => setVideoUnavailable(true)} />
)}
```

- [x] **Step 4: 更新体验版启动门禁**

```js
assert.match(loginPage, /miniappOssMedia\.loginBackgroundVideo/)
assert.match(loginPage, /muted/)
assert.match(loginPage, /onError/)
```

### Task 3: 修复协议确认和手机号错误闭环

**Files:**
- Create: `miniapp/src/domain/loginRuntime.ts`
- Modify: `miniapp/src/pages/login/index.tsx`
- Modify: `miniapp/src/pages/login/phone.tsx`

**Interfaces:**
- Produces: `isValidLoginPhone(phone: string): boolean`、`resolvePhoneLoginError(fallback: string, error?: unknown): string`。
- Consumes: 登录接口异常对象、协议勾选状态和登录方式。

- [x] **Step 1: 用纯函数区分手机号和验证码错误**

```ts
export function resolvePhoneLoginError(fallback: string, error?: unknown) {
  const message = readErrorText(error)
  if (/验证码|sms|verification code|code.*(?:invalid|error)/i.test(message)) return '验证码错误，请重新输入'
  if (/手机号|phone|mobile/i.test(message)) return '你输入的手机号有误'
  return message || fallback
}
```

- [x] **Step 2: 提交前校验手机号并使用稳定错误文案**

```ts
if (!isValidLoginPhone(phoneNumber)) {
  showError('你输入的手机号有误')
  return
}
```

- [x] **Step 3: 首次勾选协议时展示协议弹窗**

```ts
const handleToggleAgreement = () => {
  if (agreementAccepted) setAgreementAccepted(false)
  else setShowDialog(true)
}
```

- [x] **Step 4: 同意后恢复登录方式弹层并允许继续**

Run: `cd miniapp && npm run validate:login-closure`

Expected: 错误映射、协议勾选和登录路由测试通过。

### Task 4: 统一底部按钮和首登默认状态

**Files:**
- Create: `miniapp/src/pages/login/components/LoginNextButton.tsx`
- Modify: `miniapp/src/pages/login/components/LoginProfileShell.tsx`
- Modify: `miniapp/src/pages/login/phone.tsx`
- Modify: `miniapp/src/pages/login/phone.scss`
- Modify: `miniapp/src/pages/login/age.tsx`

**Interfaces:**
- Produces: `LoginNextButton({ active, onClick, className? })`，手机号页和五步资料页共享相同按钮与弯向右箭头。
- Consumes: 当前页面是否满足提交条件的 `active` 状态。

- [x] **Step 1: 抽取 126rpx 圆形按钮和弯向右箭头**

```tsx
<View className={className} style={{ width: '126rpx', height: '126rpx', borderRadius: '63rpx' }}>
  <View className="login-next-icon__curve" />
  <View className="login-next-icon__head" />
</View>
```

- [x] **Step 2: 手机号页和资料页改用共享按钮**

```tsx
<LoginNextButton active={phoneLoginActive && !loading} onClick={handlePhoneLogin} />
```

- [x] **Step 3: 出生日期默认值可用时直接点亮**

```ts
const hasValidDate = Boolean(years[value[0]] && MONTHS[value[1]] && DAYS[value[2]])
```

- [x] **Step 4: 禁用态不触发提交，激活态只触发一次**

Run: `cd miniapp && npm run validate:login-closure`

Expected: 共享按钮、箭头样式、默认日期点亮和点击保护测试通过。

### Task 5: 全量验证和包体积验收

**Files:**
- Modify: `docs/superpowers/plans/2026-07-31-login-pending-items-closure.md`

**Interfaces:**
- Consumes: 前四个任务的全部实现。
- Produces: 可构建的小程序登录闭环和可复核的验证记录。

- [x] **Step 1: 运行登录专项测试**

Run: `cd miniapp && npm run validate:login-closure`

Expected: PASS。

- [x] **Step 2: 运行专项 ESLint 与实际微信构建验证**

Run: `cd miniapp && npx eslint src/pages/login src/domain/loginRuntime.ts --ext .ts,.tsx`

Expected: 无错误。

记录：仓库全量 `npx tsc --noEmit` 仍被既有 Taro 类型声明及本任务外旧代码错误阻断；本任务文件未出现在错误清单中，专项 ESLint 与实际微信构建均通过。

- [x] **Step 3: 构建真实登录版微信小程序**

Run: `cd miniapp && MINIAPP_DEV_FIXED_LOGIN=false npm run build:weapp`

Expected: 构建成功，构建后页面注册、启动模式和包体积门禁全部通过。

- [x] **Step 4: 核对主包不包含 MP4**

Run: `cd miniapp && find dist -type f -name '*.mp4' -print && npm run validate:package-size`

Expected: 不输出 MP4 路径；主包仍低于项目门禁上限。

- [x] **Step 5: 更新本计划勾选状态并输出交付摘要**

Run: `git diff --check && git status --short`

Expected: 无空白错误；只列出本任务和进入任务前已存在的改动。
