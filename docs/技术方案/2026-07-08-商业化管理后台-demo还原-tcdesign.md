# 2026-07-08 商业化管理后台 Demo 还原技术方案

## 目标

以 `docs/静态Demo/04-商业化（VIP、千寻币、解锁与资产中心）/html/admin.html` 为设计基线，在正式管理后台组件化还原 ADM-04 五个页面，并打通本地唯一数据库菜单。

## 页面范围

| 页面 ID | 正式路由 | 菜单归属 |
| --- | --- | --- |
| ADM-04-PAGE-commerce-config | `/commercial/config` | 移动端配置 / 商业化配置 |
| ADM-04-PAGE-commerce-order-list | `/commercial/orders` | 财务中心 / 商业化订单 |
| ADM-04-PAGE-asset-flow-list | `/commercial/flows` | 财务中心 / 资产流水 |
| ADM-04-PAGE-refund-list | `/commercial/refunds` | 财务中心 / 退款记录 |
| ADM-04-PAGE-commerce-reconcile | `/commercial/reconcile` | 财务中心 / 轻量对账 |

## 组件映射

| Demo 元素 | 正式前端落点 |
| --- | --- |
| `admin-page-inner` / `admin-page-header` | `CommercialManagement.tsx` 局部页面框架 |
| `admin-summary-grid` / `stat-card` | 摘要卡组件 |
| `commerce-tabs` / `config-panel` | 配置页 7 Tab |
| `query-panel` / `query-grid` | 订单、流水、退款、对账查询区 |
| `table-wrap` | 统一高密度表格容器 |
| `drawer-backdrop` / `drawer` | 配置日志、订单、流水、退款详情右侧抽屉 |
| `modal-backdrop` / `modal` | 保存、套餐编辑、退款、导出确认弹窗 |
| `mobile-icon` / `icon-config-input` | 移动端图标展示与配置输入 |

## 数据与 SQL

- 展示数据优先使用 `frontend/src/api/commercial.ts` 现有接口。
- 后端缺少的 Demo 展示字段由前端 adapter 补齐，不新增接口。
- 菜单通过 `deploy/sql/prod/031_commercial_demo_menu_alignment.sql` 幂等更新当前唯一数据库。
- 当前库中 `id=820` 已属于内容管理的“应用配置”，SQL 已恢复并保护该菜单，不再按固定 ID 隐藏旧入口。

## 验收口径

- 管理后台视口：1440x900。
- 截图基线：静态 Demo 五页。
- 截图对象：正式前端五页 + 配置日志抽屉 + 保存配置弹窗。
- 静态门禁：`docs/测试文档/商业化-PRD04-static-check.mjs`。
