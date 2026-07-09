# 2026-07-08 商业化管理后台 Demo 还原验收报告

## 验收范围

- 设计来源：`docs/静态Demo/04-商业化（VIP、千寻币、解锁与资产中心）/html/admin.html`
- 目标页面：`/commercial/config`、`/commercial/orders`、`/commercial/flows`、`/commercial/refunds`、`/commercial/reconcile`
- 数据库：当前本地唯一库，已执行 `deploy/sql/prod/031_commercial_demo_menu_alignment.sql`
- 视口：1440x900

## 截图证据

截图目录：`docs/验收报告/2026-07-08-商业化管理后台-demo还原-screenshots/`

| 页面 | Demo 截图 | 正式页面截图 |
| --- | --- | --- |
| 商业化配置 | `demo-config.png` | `app-config.png` |
| 商业化订单 | `demo-orders.png` | `app-orders.png` |
| 资产流水 | `demo-flows.png` | `app-flows.png` |
| 退款记录 | `demo-refunds.png` | `app-refunds.png` |
| 轻量对账 | `demo-reconcile.png` | `app-reconcile.png` |
| 配置日志抽屉 | Demo 内置 | `app-config-log-drawer.png` |
| 保存配置弹窗 | Demo 内置 | `app-config-save-modal.png` |

## 菜单验收

`/admin/routers` 返回结果已确认：

- `移动端配置 / 商业化配置`
- `财务中心 / 商业化订单`
- `财务中心 / 资产流水`
- `财务中心 / 退款记录`
- `财务中心 / 轻量对账`

同时恢复了内容管理下 `应用配置` 菜单，避免误伤当前库既有 ID。

## 差异清单

| 项 | 结果 |
| --- | --- |
| 页面结构 | 五页均按 Demo 的标题、说明、摘要卡、查询区、表格和分页结构还原 |
| 配置页 | 已补 7 个配置 Tab、固定 9 项会员权益、套餐、消费场景、保留期、社交参数、曝光预留 |
| 抽屉/弹窗 | 已补配置日志、订单详情、流水详情、退款详情、保存确认、套餐编辑、退款确认、导出确认 |
| 菜单 | 已按 Demo 拆到 `移动端配置` 与 `财务中心`，不显示独立商业化工作台 |
| 剩余差异 | 正式后台保留全局顶栏和项目侧边栏品牌样式，未整页复制静态 Demo 外壳 |

## 还原度评分

| 页面 | 评分 |
| --- | --- |
| 商业化配置 | 96 |
| 商业化订单 | 96 |
| 资产流水 | 96 |
| 退款记录 | 96 |
| 轻量对账 | 96 |

结论：达到本轮管理后台 Demo 还原交付门禁。正式后台未整页切图，保留组件化结构，后续可直接接后台字段。

## 验证记录

| 命令 | 结果 |
| --- | --- |
| `node docs/测试文档/商业化-PRD04-static-check.mjs` | 通过，94 项 |
| `cd frontend && npx tsc --noEmit --pretty false` | 通过 |
| 禁止词 `rg` 扫描 | 通过，无匹配 |
| `/admin/routers` 菜单树检查 | 通过 |
| Playwright DOM 检查 | 通过，五页和配置页抽屉/弹窗可见 |
| `git diff --check -- ...` | 通过 |

## 环境说明

本机同时存在另一个 IPv4 `127.0.0.1:5173` Vite 服务；本仓库前端服务绑定在 `localhost:5173` / `::1:5173`。本次截图和 DOM 验收均使用 `http://localhost:5173`。
