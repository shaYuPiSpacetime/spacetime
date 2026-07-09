# 小程序启动页改为登录页

- **日期**：2026-07-09
- **状态**：已确认
- **范围**：小程序前端

## 1. 背景

小程序当前 `app.config.ts` 的 `pages` 数组第一项是 `pages/login/address`（注册流程-地址页），而非 `pages/login/index`（登录页）。启动时用户首先看到的是地址页，需要将启动入口改为登录页。

## 2. 目标

将小程序启动入口页从 `pages/login/address` 改为 `pages/login/index`，让用户启动小程序后首先看到登录页。

## 3. 方案

### 改动文件

`src/app.config.ts` — 仅调整 `pages` 数组顺序。

### 改动内容

将 `pages/login/index` 移到 `pages` 数组第一位：

```diff
pages: [
-   'pages/login/address',
    'pages/login/index',
+   'pages/login/address',
    'pages/login/phone',
    ...
]
```

### 不改动

- `app.tsx` 启动逻辑：现有 `useLaunch` 中已有 token 检查和无 token 时的 redirect 逻辑，后续正式环境可正常拦截
- 各登录步骤页：步骤间均为相对路径跳转（如 `/pages/login/gender`），入口调整不影响流程
- Tab 页和分包路由：不受影响

## 4. 影响分析

| 场景 | 影响 |
|------|------|
| MOCK 模式启动 | 直接进入登录页，无需额外操作 ✅ |
| 非 MOCK 模式无 token | `app.tsx` 已有 `reLaunch` 到登录页的逻辑，与入口一致 ✅ |
| 非 MOCK 模式有 token | `app.tsx` 检查 token 后恢复登录态，暂不跳转（登录页短暂可见）；后续正式上线前可补充已登录自动跳首页逻辑 |
| 登录流程各步骤 | 不受影响 ✅ |

## 5. 验证

1. 启动小程序，确认首屏为登录页（`pages/login/index`）
2. 完成登录流程，确认各步骤页（phone → gender → age → ... ）跳转正常
3. 确认 Tab 页切换正常
