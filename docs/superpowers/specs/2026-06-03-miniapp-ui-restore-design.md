# 小程序 UI 全量还原设计文档

> 日期：2026-06-03 | 来源：蓝湖「时空邂逅」项目 | 目标：miniapp/

## 1. 概述

将蓝湖项目「时空邂逅」中全部 29 张手机端设计图 1:1 还原到 Taro 小程序项目 `miniapp/` 中。前期全部使用 Mock 数据。

## 2. 技术栈（不变）

- Taro 4.x + React 18 + TypeScript
- Tailwind CSS（设计稿 375px 基准）
- @antmjs/vantui（VantUI）
- Zustand 状态管理
- Mock 数据直接写在组件/service 中，不额外引入 mock 库

## 3. 页面规划

### 3.1 TabBar 页面（5 个，复用现有路由）

| Tab | 路由 | 页面名 | 对应蓝湖设计 |
|-----|------|--------|-------------|
| 觅缘 | `pages/index/index` | 觅缘首页 | 成家-觅缘 (set: 信息未完善/信息完善 + 子弹窗) |
| 社区 | `pages/community/index` | 社区 | 无蓝湖设计稿，自建基础 UI |
| 测评 | `pages/assessment/index` | 测评 | 无蓝湖设计稿，自建基础 UI |
| 消息 | `pages/chat/index` | 消息 | 无蓝湖设计稿，自建基础 UI |
| 我的 | `pages/profile/index` | 个人中心 | 我的 (set: 会员开通/过期状态) |

### 3.2 子页面（需新增路由）

| 路由 | 页面名 | 对应蓝湖设计 |
|------|--------|-------------|
| `pages/featured/index` | 精选首页 | 成家-精选 (set) |
| `pages/featured/unlock-guest` | 解锁嘉宾 | 成家-精选-解锁嘉宾 |
| `pages/membership/index` | 会员中心 | 会员中心-全 (set) |
| `pages/membership/records` | 会员记录 | 会员记录 |
| `pages/coins/index` | 成家币 | 成家币 (set) |
| `pages/coins/detail` | 成家币明细 | 成家币明细 |
| `pages/login/index` | 登录-授权 | 登录-授权 |
| `pages/login/gender` | 登录-性别选择 | 登录-性别选择 |
| `pages/login/education` | 登录-学历 | 登录-学历 |
| `pages/login/address` | 登录-地址 | 登录-地址 |
| `pages/login/age` | 登录-年龄选择 | 登录-年龄选择 |

### 3.3 弹窗/子状态（通过组件内状态切换，不走路由）

- 精选-认证弹窗、精选-购买成家币弹窗
- 觅缘-yo弹窗、觅缘-yo弹窗-文字点亮、觅缘-三重认证弹窗
- 什么是悄悄话弹窗
- 会员中心各状态：已开通/未开通/已过期/连续包年（Tab 切换）
- 成家币明细-暂无数据（空状态）

## 4. 目录结构

```
miniapp/src/
├── components/              # 公共组件
│   ├── UserCard/           # 用户卡片（头像+信息+操作）
│   ├── EmptyState/         # 空状态占位
│   ├── AuthModal/          # 认证弹窗封装
│   └── ...
├── pages/
│   ├── index/              # 觅缘（Tab1）
│   ├── community/          # 社区（Tab2）
│   ├── assessment/         # 测评（Tab3）
│   ├── chat/              # 消息（Tab4）
│   ├── profile/           # 我的（Tab5）
│   ├── featured/          # 精选首页
│   ├── membership/        # 会员中心
│   ├── coins/             # 成家币
│   └── login/             # 登录流程
├── services/              # API+Mock 数据
├── stores/               # Zustand
├── types/                # TypeScript 类型
├── constants/            # 常量/枚举
├── utils/                # 工具函数
└── hooks/                # 自定义 hooks
```

## 5. 还原流程

每个蓝湖设计通过 `mcp__lanhu__lanhu_design` 以 `analyze` 模式拉取 HTML+CSS+tokens+layers，按 `miniapp-ui-技术方案.md` 的度量和颜色映射规则翻译为 Taro 组件代码。

## 6. 实施顺序

1. **基础设施** — 公共组件（UserCard/EmptyState）、类型定义、Mock 数据、API 层补齐
2. **精选首页** (`featured`) — 6 张设计图
3. **觅缘** (`index`) — 5 张设计图（Tab1）
4. **我的** (`profile`) — 3 张设计图（Tab5）
5. **会员中心** (`membership`) — 6 张设计图
6. **成家币** (`coins`) — 3 张设计图
7. **登录流程** (`login`) — 5 张设计图
8. **社区/测评/消息** — 补充基础 UI（无蓝湖设计稿）

## 7. 约束

- 所有数据前期 Mock，不接真实 API
- 严格按 TEAM_STANDARDS.md 前端编码规范
- 1px = 1 Tailwind 单位（375 基准）
- 颜色用 tailwind.config.js 中定义的设计 Token
