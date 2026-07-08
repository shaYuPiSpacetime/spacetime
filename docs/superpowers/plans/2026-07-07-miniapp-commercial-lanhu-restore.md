# Miniapp Commercial Lanhu Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按蓝湖截图 1:1 补齐小程序千寻币、会员中心、订阅管理及会员记录详情相关页面闭环。

**Architecture:** 继续复用 `LanhuNav`、现有 hook 和 `lanhuDemo` mock 数据；新增独立订阅管理页和会员详情页承接蓝湖 78、59、77。支付弹层使用项目内 mock 微信支付键盘样式，不调用微信原生组件。

**Tech Stack:** Taro React、TypeScript、内联 rpx 样式、Node 原生 assert 静态校验。

## Global Constraints

- 不执行 Taro build、dev server 或小程序编译。
- 页面数据继续通过 `miniapp/src/services/lanhuDemo.ts` 和 hook 消费。
- 切不到的图不乱切，使用样式占位并在验收报告记录。
- 保留当前未提交改动，不回滚与本任务无关文件。

---

### Task 1: 商业化覆盖红灯校验

**Files:**
- Modify: `miniapp/scripts/validate-commerce-ui-coverage.mjs`

**Interfaces:**
- Consumes: `miniapp/src/data/lanhuDemo.json`
- Produces: `node miniapp/scripts/validate-commerce-ui-coverage.mjs` 的红绿门禁

- [x] **Step 1: 写失败校验**

要求会员中心、订阅管理、会员记录详情、千寻币所有蓝湖状态都在 manifest、页面数据和源码中有落点。

- [x] **Step 2: 运行红灯**

Run: `cd miniapp && node scripts/validate-commerce-ui-coverage.mjs`

Expected: FAIL，原因是缺少订阅管理独立页、会员详情页或仍出现“成家币”。

### Task 2: 数据与路由补齐

**Files:**
- Modify: `miniapp/src/app.config.ts`
- Modify: `miniapp/src/data/lanhuDemo.json`
- Modify: `miniapp/src/types/membership.ts`

**Interfaces:**
- Produces: `/pages/membership/subscription`
- Produces: `/pages/membership/record-detail?status=paid|refunded`

- [x] **Step 1: 注册页面**

在 membership 分包加入 `subscription`、`record-detail`。

- [x] **Step 2: 更新 manifest**

把 `订阅管理` 指到 `/pages/membership/subscription`，把会员详情已支付/已退款指到 `/pages/membership/record-detail` 的状态路由。

### Task 3: 页面实现与文案统一

**Files:**
- Modify: `miniapp/src/pages/coins/index.tsx`
- Modify: `miniapp/src/pages/coins/detail.tsx`
- Modify: `miniapp/src/hooks/useCoins.ts`
- Modify: `miniapp/src/pages/membership/index.tsx`
- Modify: `miniapp/src/pages/membership/records.tsx`
- Create: `miniapp/src/pages/membership/subscription.tsx`
- Create: `miniapp/src/pages/membership/subscription.config.ts`
- Create: `miniapp/src/pages/membership/record-detail.tsx`
- Create: `miniapp/src/pages/membership/record-detail.config.ts`

**Interfaces:**
- Consumes: `useCoins()`、`useMembership()`
- Produces: 可点击跳转的千寻币支付、会员支付、订阅管理和会员详情闭环

- [x] **Step 1: 千寻币替换**

将商业化源码中的“成家币”替换为“千寻币”，包含页面标题、协议、明细、用途、支付结果和相关入口。

- [x] **Step 2: 微信支付 mock 面板**

按蓝湖支付截图实现大金额、零钱支付行、密码格、数字键盘的 mock 微信支付浮层。

- [x] **Step 3: 新增订阅管理页**

按蓝湖 78 实现顶部会员卡、套餐扣费说明、取消续费指引和底部会员订单按钮。

- [x] **Step 4: 新增会员详情页**

按蓝湖 59、77 实现已支付/已退款两种会员详情状态。

### Task 4: 轻量验证与验收记录

**Files:**
- Modify: `docs/验收报告/2026-07-07-商业化蓝湖还原-acceptance.md`

**Interfaces:**
- Consumes: 蓝湖截图目录 `miniapp/.lanhu-ref/lanhu-full-2026-07-07/images`
- Produces: 缺图清单、差异清单、静态校验结果

- [x] **Step 1: 运行绿灯**

Run: `cd miniapp && node scripts/validate-commerce-ui-coverage.mjs`

Expected: PASS。

- [x] **Step 2: 输出验收记录**

记录本轮未跑小程序编译、未做截图像素比对的限制，并列明缺失切图。
