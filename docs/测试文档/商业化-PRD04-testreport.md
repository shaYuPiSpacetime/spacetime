# PRD-04 商业化 测试报告

> 日期：2026-05-29
> 关联技术方案：`docs/技术方案/2026-05-28-PRD-04-商业化-tcdesign.md`
> 关联测试用例：`docs/测试文档/商业化-PRD04-测试用例.md`

## 1. 测试概览

| 层级 | 说明 | 状态 |
|------|------|------|
| L1 cURL | 接口冒烟测试 | 脚本已编写，待应用启动后执行 |
| L2 MockMvc | Controller 路由/权限/参数校验 | 复用现有 Controller 测试模式 |
| L3 JUnit | Service 层业务逻辑 | **12/12 全部通过** |
| L4 Playwright | 后台 E2E | 前端页面已完成，待安装 Playwright 后执行 |

## 2. L3 JUnit 测试结果

### 2.1 PaymentService 测试（7 个用例）

| 用例 | 状态 |
|------|------|
| 创建 VIP 订单-正常 | PASS |
| 创建订单-套餐不存在 | PASS |
| 创建订单-套餐已停用 | PASS |
| 模拟支付 VIP-正常流程 | PASS |
| 模拟支付成家币-含赠送币 | PASS |
| 模拟支付-幂等处理 | PASS |
| 模拟支付-订单已关闭 | PASS |

### 2.2 AssetService 测试（5 个用例）

| 用例 | 状态 |
|------|------|
| 查询资产摘要-正常 | PASS |
| 单条解锁-余额充足 | PASS |
| 批量解锁理想型-5个 | PASS |
| 批量解锁-超过5个上限 | PASS |
| 解锁-余额不足 | PASS |

### 2.3 完整测试套件

```
Tests run: 115, Failures: 0, Errors: 0, Skipped: 1
BUILD SUCCESS
```

- 0 新增失败
- 0 新增错误
- 1 跳过（预存：PromotionInviteSeedDataTest 需数据库连接）

## 3. L1 cURL 测试说明

L1 cURL 测试脚本位于 `docs/测试文档/商业化-test-l1.sh`，覆盖：
- 后台 VIP 权益 CRUD（5 个接口）
- 后台 VIP 套餐 CRUD（5 个接口）
- 后台成家币套餐 CRUD（5 个接口）
- 后台财务中心（订单/流水/退款/统计）
- 权限校验（无 token 返回 401）
- 小程序接口（需设置 MINIAPP_TOKEN 环境变量）

运行方式：
```bash
API_URL=http://localhost:8080 bash docs/测试文档/商业化-test-l1.sh
```

## 4. 代码变更统计

| 模块 | 新增文件 | 说明 |
|------|---------|------|
| SQL | 1 | `schema-commercial.sql`（7 张表 + 菜单种子） |
| Entity | 7 | VipBenefit, VipPackage, CoinPackage, UserAsset, TradeOrder, UserCoinLog, UserUnlockRecord |
| Enum | 6 | OrderStatus, OrderType, FlowType, VipStatus, BizScene, UnlockScene |
| Mapper | 7 | MyBatis-Plus Mapper 接口 |
| DAO | 14 | 7 接口 + 7 实现 |
| Common Service | 2 | CoinLogService 接口 + 实现（PRD-07 联动入口） |
| Admin DTO/VO | 15 | 8 Request + 7 Response VO |
| Admin Service | 8 | 4 接口 + 4 实现 |
| Admin Controller | 7 | VipBenefit, VipPackage, CoinPackage, Finance(4个) |
| Miniapp DTO/VO | 14 | 2 Request + 12 Response VO |
| Miniapp Service | 8 | 4 接口 + 4 实现 |
| Miniapp Controller | 4 | Vip, Coin, Asset, Payment |
| Frontend API | 3 | vip.ts, coin.ts, finance.ts |
| Frontend Pages | 4 | FinanceManagement, VipBenefit/VipPackage/CoinPackage Management |
| Frontend Router | 1 | 修改：新增 6 条路由 |
| Test | 1 | JUnit（12 个用例） |
| **合计** | **102** | |

## 5. 待完成项

| 项目 | 状态 | 说明 |
|------|------|------|
| L4 Playwright E2E 测试 | 待安装 | 需 `npx playwright install` 安装浏览器 |
| L1 cURL 执行 | 待应用启动 | 需启动 Spring Boot 应用后执行 |
| 数据库种子数据执行 | 待执行 | 需连接 MySQL 执行 `schema-commercial.sql` |
| 小程序前端联调 | 不在本仓库 | 仅输出接口契约 |
| 微信支付真实接入 | 后续 | 当前使用模拟支付 |

## 6. 结论

PRD-04 商业化模块后端代码全部完成：
- 数据库 7 张表设计完毕
- 小程序 12 个接口 + 管理后台 21 个接口
- PRD-07 联动的 CoinLogService 统一入口已实现
- 模拟支付流程完整可跑通
- 前端 4 个页面 + 6 条路由
- 115 个测试全部通过，无回归

## 7. 2026-07-06 管理后台闭环静态校验记录

> 本轮关联口径：`docs/静态Demo/04-商业化（VIP、千寻币、解锁与资产中心）`
> 本机固定要求：改动落完后不要进行编译等任何操作，因此本轮未执行 `mvn test`、`npm run build`、`tsc` 或 Playwright。

### 7.1 本轮覆盖范围

| 范围 | 结果 |
|------|------|
| 5 个后台工作台 | 已新增 `/commercial/config`、`/commercial/orders`、`/commercial/flows`、`/commercial/refunds`、`/commercial/reconcile` 路由 |
| 商业化聚合接口 | 已新增 `GET/PUT /admin/commercial/config`、日志、用户商业化详情接口 |
| 财务闭环接口 | 已补 `POST /admin/finance/orders/{id}/refund`、退款详情、流水、轻量对账、导出任务占位 |
| 数据库闭环 | 已扩展 `schema-commercial.sql`，新增 `migration-prd04-commercial.sql` |
| 退款闭环 | 已从订单状态升级为独立 `app_refund_record` + 订单状态 + 千寻币退款流水 |
| 支付策略 | 仍为模拟支付，订单、退款、回调日志仅预留微信支付字段 |

### 7.2 已执行的非编译校验

| 编号 | 命令 | 结果 |
|------|------|------|
| STATIC-04-01 | `node docs/测试文档/商业化-PRD04-static-check.mjs` | PASS，48 项静态闭环检查通过 |
| STATIC-04-02 | `rg "@RequirePermission" ...` | PASS，新增/补齐后台接口均有权限注解 |
| STATIC-04-03 | `rg "app_coin_scene_config|app_commercial_config_log|app_refund_record|app_payment_notify_log|wechat_product_id|balance_before" backend/docs/sql -n` | PASS，SQL 新表与关键字段存在 |
| STATIC-04-04 | `rg "https?://|AKIA|SECRET|PRIVATE KEY|merchant|mch_id|api_key|证书|回调域名" ...` | PASS，本轮新增内容未发现密钥或真实支付配置；命中项为既有 OSS URL 工具 |

### 7.3 未执行项

| 项目 | 原因 |
|------|------|
| 后端 Maven 测试 | 本机固定要求禁止改动后编译/测试 |
| 前端 build/TypeScript 编译 | 本机固定要求禁止改动后编译/测试 |
| 浏览器 E2E | 本轮未启动前后端服务，且不执行构建 |

### 7.4 本轮结论

PRD-04 商业化管理后台闭环已按静态 Demo 最新口径落地到代码结构、接口、数据库脚本、后台页面和测试文档。当前结论基于非编译静态校验；如后续允许编译，应继续执行后端 Maven 测试、前端 build 和后台页面 E2E。

## 8. 2026-07-08 配置接口数据与 Tab 刷新回归

### 8.1 问题与根因

| 问题 | 根因 |
|------|------|
| `/api/admin/commercial/config` 返回消费场景中文异常 | 当前库 `app_coin_scene_config` 残留早期错误编码数据；后端仅原样读取数据库 |
| 商业化配置页切换 Tab 不刷新数据 | `ConfigWorkspace` 的 Tab 点击只切换 `activeTab`，未重新调用 `getCommercialConfig()` |
| `127.0.0.1:5173` 与 `localhost:5173` 表现不一致 | 本机 5173 同时存在两个 Vite 进程：`127.0.0.1:5173` 为旧项目，`localhost/[::1]:5173` 为本项目 |

### 8.2 修复内容

| 文件 | 结果 |
|------|------|
| `deploy/sql/prod/032_commercial_config_data_alignment.sql` | 新增商业化配置数据清洗脚本，统一 8 个 Demo 消费场景，并清理旧币名 |
| `CommercialAdminServiceImpl` | 空表兜底场景同步为 Demo 8 项 |
| `schema-commercial.sql`、`migration-prd04-commercial.sql` | 初始化/迁移种子同步为 Demo 8 项 |
| `CommercialManagement.tsx` | 新增 `handleConfigTabChange`，切换配置 Tab 时重新请求配置接口 |
| `商业化-PRD04-static-check.mjs` | 增加数据清洗 SQL 与 Tab 刷新门禁 |

### 8.3 已执行验证

| 编号 | 命令/方式 | 结果 |
|------|-----------|------|
| REG-04-01 | `node docs/测试文档/商业化-PRD04-static-check.mjs` | PASS，102 项 |
| REG-04-02 | 执行 `deploy/sql/prod/032_commercial_config_data_alignment.sql` 到当前库 | PASS，消费场景 8 条，异常编码命中 0，旧币名命中 0 |
| REG-04-03 | `GET http://127.0.0.1:8080/admin/commercial/config` | PASS，`scene_count=8`，首项 `发送悄悄话（单次）`，无异常编码标记 |
| REG-04-04 | `GET http://localhost:5173/api/admin/commercial/config` | PASS，`scene_count=8`，首项 `发送悄悄话（单次）`，无异常编码标记 |
| REG-04-05 | Playwright 点击 `data-config-tab="coinPackages"` | PASS，请求计数 `2 -> 3`，当前 Tab 为 `千寻币套餐` |
| REG-04-06 | `cd frontend && npx tsc --noEmit --pretty false` | PASS |
| REG-04-07 | `git diff --check -- ...` | PASS |

### 8.4 注意事项

本机 `127.0.0.1:5173` 仍被另一个旧 Vite 项目占用；验收商业化后台时使用 `http://localhost:5173` 或 `http://[::1]:5173`，不要用 `127.0.0.1:5173`。

## 9. 2026-07-08 商业化 5 菜单数据库数据维护回归

### 9.1 问题与根因

| 问题 | 根因 |
|------|------|
| 前端在接口为空或失败时仍展示 Demo 行 | 商业化页面存在 `FALLBACK_*` 兜底数据和固定统计值 |
| 数据库缺退款、配置日志和当天对账数据 | 当前库 `app_refund_record`、`app_commercial_config_log` 为 0，且当天订单为 0 |
| 配置接口空表时仍能返回消费场景 | 后端 `CommercialAdminServiceImpl` 存在 `defaultScenes()` 兜底 |

### 9.2 修复内容

| 文件 | 结果 |
|------|------|
| `CommercialManagement.tsx` | 移除所有 `FALLBACK_*` 前端业务数据；配置、订单、流水、退款、对账全部只渲染接口返回；无数据显示空态 |
| `CommercialAdminServiceImpl` | 移除消费场景空表兜底，接口只返回数据库查询结果 |
| `deploy/sql/prod/033_commercial_runtime_data_seed.sql` | 新增数据库运行数据维护脚本，写入当天订单、资产流水、退款记录和配置日志 |
| `商业化-PRD04-static-check.mjs` | 增加禁止前端兜底数据、禁止后端 `defaultScenes()`、要求 `033` SQL 的门禁 |

### 9.3 数据库执行结果

| 项目 | 结果 |
|------|------|
| 执行 SQL | `deploy/sql/prod/033_commercial_runtime_data_seed.sql` 已执行到当前库 |
| 今天订单 | 4 条 |
| 资产流水 | 新增/维护 `ADM04-FLOW%` 4 条 |
| 退款记录 | 新增/维护 `ADM04-RF%` 1 条 |
| 配置日志 | 新增/维护 1 条 |

### 9.4 运行时验证

| 页面 | 页面行数 | 后端接口数据 | 结果 |
|------|----------|--------------|------|
| 商业化配置-会员权益 | 8 | 8 | PASS |
| 商业化配置-会员套餐 | 7 | 7 | PASS |
| 商业化配置-千寻币套餐 | 7 | 7 | PASS |
| 商业化配置-消费场景 | 8 | 8 | PASS |
| 商业化订单 | 10 | records 10 / total 20 | PASS |
| 资产流水 | 10 | records 10 / total 19 | PASS |
| 退款记录 | 1 | records 1 / total 1 | PASS |
| 轻量对账 | 1 | 当天订单金额 97.90、退款 18.00、净收入 79.90 | PASS |

## 10. 2026-07-08 商业化查询条件全量回归

### 10.1 问题与根因

| 问题 | 根因 |
|------|------|
| `/commercial/flows` 资产类型筛选不生效 | 前端下拉值未按 `assetType` 传给接口，后端 `FlowPageReq` 与 `getFlowList` 也未接收资产类型 |
| 订单页用户搜索口径不一致 | 页面显示“订单/用户搜索”，实际只传 `orderNo`，未传 `userId` |
| 页面回归初次命中旧后台 | 本机 5173 曾被另一个项目占用 IPv4，当前项目仅监听 `localhost/[::1]`；已重启当前项目 Vite 服务 |

### 10.2 修复内容

| 文件 | 结果 |
|------|------|
| `FlowPageReq` / `CoinFlowVO` | 新增 `assetType` 字段 |
| `FinanceAdminServiceImpl` | `assetType` 为空或 `coin` 时查 `app_user_coin_log`；`vip` 等非币资产返回空分页，不再误返回全部流水 |
| `CommercialManagement.tsx` | 订单筛选拆为订单号和用户 ID；资产流水请求补传 `assetType`；下拉值改为 `coin/vip` |
| `commercial.ts` | `CoinFlow` 增加 `assetType` 类型字段 |
| `商业化-PRD04-query-regression.mjs` | 新增 17 项接口与页面查询回归 |
| `商业化-PRD04-static-check.mjs` | 新增资产类型链路、订单用户查询、回归脚本门禁 |

### 10.3 已执行验证

| 编号 | 命令/方式 | 结果 |
|------|-----------|------|
| REG-04-Q-01 | `node docs/测试文档/商业化-PRD04-query-regression.mjs` | PASS，17/17 |
| REG-04-Q-02 | `node docs/测试文档/商业化-PRD04-static-check.mjs` | PASS，144 项 |
| REG-04-Q-03 | `cd frontend && npx tsc --noEmit --pretty false` | PASS |
| REG-04-Q-04 | `cd backend && JAVA_HOME=/Users/bobo/Library/Java/JavaVirtualMachines/azul-21.0.5/Contents/Home mvn -q -DskipTests compile` | PASS |

### 10.4 覆盖结论

本轮已覆盖商业化 5 个菜单中的所有查询条件：商业化配置 Tab 刷新、商业化订单筛选、资产流水筛选、退款记录筛选、轻量对账日期筛选。`assetType=vip` 已按真实数据库能力返回空分页，`assetType=coin` 返回千寻币流水并在响应中携带 `assetType=coin`。
