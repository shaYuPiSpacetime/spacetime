# PRD-04 商业化 测试用例文档

> 日期：2026-05-28
> 关联技术方案：`docs/技术方案/2026-05-28-PRD-04-商业化-tcdesign.md`

## 1. 测试层级说明

| 层级 | 覆盖范围 | 工具 | 产物 |
|------|---------|------|------|
| L1 cURL | 接口冒烟测试、权限校验 401/403 | Bash + curl | `商业化-test-l1.sh` |
| L2 MockMvc | Controller 路由、参数校验、返回结构 | Spring MockMvc | `*ControllerTest.java` |
| L3 JUnit | Service 业务逻辑、事务、边界 | JUnit 5 + Mockito | `*ServiceTest.java` |
| L4 Playwright | 后台页面 E2E 流程 | Playwright | `commercial.spec.ts` |

## 2. L1 cURL 冒烟测试用例

### 2.1 小程序接口

| 编号 | 用例 | Method | URL | 预期 |
|------|------|--------|-----|------|
| L1-M-01 | 查询 VIP 套餐列表 | GET | `/miniapp/vip/packages` | 200, 返回已启用套餐数组 |
| L1-M-02 | 查询 VIP 权益列表 | GET | `/miniapp/vip/benefits` | 200, 返回已启用权益数组 |
| L1-M-03 | 查询 VIP 状态（未开通） | GET | `/miniapp/vip/status` | 200, vipStatus=inactive |
| L1-M-04 | 查询成家币套餐列表 | GET | `/miniapp/coin/packages` | 200, 返回已启用套餐数组 |
| L1-M-05 | 查询成家币余额 | GET | `/miniapp/coin/balance` | 200, coinBalance 为数字 |
| L1-M-06 | 查询资产摘要 | GET | `/miniapp/asset/summary` | 200, 含 vipStatus/coinBalance/whisperRemain |
| L1-M-07 | 创建 VIP 订单 | POST | `/miniapp/payment/create-order` | 200, 返回 orderId+orderNo |
| L1-M-08 | 创建成家币订单 | POST | `/miniapp/payment/create-order` | 200, 返回 orderId+orderNo |
| L1-M-09 | 模拟支付成功 | POST | `/miniapp/payment/mock-pay/{orderId}` | 200, orderStatus=success |
| L1-M-10 | 重复支付幂等 | POST | `/miniapp/payment/mock-pay/{orderId}` | 200, 返回已有状态不重复处理 |
| L1-M-11 | 单条解锁 | POST | `/miniapp/asset/unlock` | 200, 扣币成功 |
| L1-M-12 | 批量解锁理想型(5个) | POST | `/miniapp/asset/unlock` | 200, 解锁成功 |
| L1-M-13 | 批量解锁理想型(6个) | POST | `/miniapp/asset/unlock` | 400, 超过上限 |
| L1-M-14 | 余额不足解锁 | POST | `/miniapp/asset/unlock` | 400, 余额不足 |
| L1-M-15 | 查询成家币流水 | GET | `/miniapp/coin/flows?page=1&size=10` | 200, 分页流水 |
| L1-M-16 | 查询解锁记录 | GET | `/miniapp/asset/unlock-records` | 200, 分页记录 |
| L1-M-17 | 查询 VIP 订单记录 | GET | `/miniapp/vip/orders` | 200, 分页订单 |
| L1-M-18 | 未登录访问需登录接口 | GET | `/miniapp/vip/status` | 401 |

### 2.2 管理后台接口

| 编号 | 用例 | Method | URL | 预期 |
|------|------|--------|-----|------|
| L1-A-01 | VIP 权益列表 | GET | `/admin/vip/benefits/list` | 200 |
| L1-A-02 | 新增 VIP 权益 | POST | `/admin/vip/benefits` | 200, 返回 id |
| L1-A-03 | 编辑 VIP 权益 | PUT | `/admin/vip/benefits/{id}` | 200 |
| L1-A-04 | 启停 VIP 权益 | PUT | `/admin/vip/benefits/{id}/status` | 200 |
| L1-A-05 | VIP 套餐列表 | GET | `/admin/vip/packages/list` | 200 |
| L1-A-06 | 新增 VIP 套餐 | POST | `/admin/vip/packages` | 200 |
| L1-A-07 | 编辑 VIP 套餐 | PUT | `/admin/vip/packages/{id}` | 200 |
| L1-A-08 | 启停 VIP 套餐 | PUT | `/admin/vip/packages/{id}/status` | 200 |
| L1-A-09 | 成家币套餐列表 | GET | `/admin/coin/packages/list` | 200 |
| L1-A-10 | 新增成家币套餐 | POST | `/admin/coin/packages` | 200 |
| L1-A-11 | 编辑成家币套餐 | PUT | `/admin/coin/packages/{id}` | 200 |
| L1-A-12 | 启停成家币套餐 | PUT | `/admin/coin/packages/{id}/status` | 200 |
| L1-A-13 | 财务订单列表 | GET | `/admin/finance/orders/list` | 200, 分页 |
| L1-A-14 | 订单筛选（按类型） | GET | `/admin/finance/orders/list?orderType=vip` | 200 |
| L1-A-15 | 订单筛选（按状态） | GET | `/admin/finance/orders/list?orderStatus=success` | 200 |
| L1-A-16 | 订单详情 | GET | `/admin/finance/orders/{id}` | 200 |
| L1-A-17 | 财务流水列表 | GET | `/admin/finance/flows/list` | 200, 分页 |
| L1-A-18 | 退款处理 | PUT | `/admin/finance/orders/{id}/refund` | 200 |
| L1-A-19 | 退款列表 | GET | `/admin/finance/refunds/list` | 200 |
| L1-A-20 | 日统计 | GET | `/admin/finance/stats/daily?date=2026-05-28` | 200 |
| L1-A-21 | 无权限访问 | GET | `/admin/finance/orders/list` (无 token) | 401 |
| L1-A-22 | 无财务权限角色 | GET | `/admin/finance/orders/list` (无权限角色) | 403 |

## 3. L3 JUnit Service 层测试用例

### 3.1 支付模块 (PaymentServiceTest)

| 编号 | 用例 | 前置条件 | 预期 |
|------|------|---------|------|
| L3-P-01 | 创建 VIP 订单 | 有效套餐 | 生成 orderNo，状态 unpaid，返回 orderId |
| L3-P-02 | 创建成家币订单 | 有效套餐 | 生成 orderNo，状态 unpaid |
| L3-P-03 | 创建订单-套餐不存在 | 无效 packageId | 抛 BusinessException |
| L3-P-04 | 创建订单-套餐已停用 | 套餐 status=DISABLED | 抛 BusinessException |
| L3-P-05 | 模拟支付 VIP 订单 | 订单 unpaid，套餐 30 天 | order→success，asset.vip_status=active，expire_time=now+30d |
| L3-P-06 | 模拟支付成家币订单 | 订单 unpaid，含赠送币 | order→success，余额增加(coinCount+bonusCoinCount)，写流水 |
| L3-P-07 | 模拟支付-幂等 | 订单已 success | 直接返回，不重复入账，不重复写流水 |
| L3-P-08 | 模拟支付-订单不存在 | 无效 orderId | 抛 BusinessException |
| L3-P-09 | 模拟支付-订单已关闭 | 订单 status=closed | 抛 BusinessException |
| L3-P-10 | VIP 支付后资产初始化 | 用户无 asset 记录 | 自动创建 user_asset 记录 |
| L3-P-11 | 成家币流水写入正确 | 充值完成 | flow_type=recharge, change_amount 含赠送币, balance_after 正确 |
| L3-P-12 | 累计充值金额更新 | 多次充值 | total_recharge 累加正确 |

### 3.2 解锁模块 (AssetServiceTest)

| 编号 | 用例 | 前置条件 | 预期 |
|------|------|---------|------|
| L3-U-01 | 单条解锁-喜欢我的 | 余额充足 | 扣币，写解锁记录（永久），写消费流水 |
| L3-U-02 | 单条解锁-看过我的 | 余额充足 | 同上 |
| L3-U-03 | 单条解锁-理想型 | 余额充足 | 扣币，expire_time=now+90d |
| L3-U-04 | 单条解锁-精选主页 | 余额充足 | 扣币，expire_time=now+3d |
| L3-U-05 | 批量解锁理想型-5个 | 余额充足 | 扣币5次，写5条解锁记录 |
| L3-U-06 | 批量解锁-超过5个 | 6个targetUserIds | 抛 BusinessException |
| L3-U-07 | 解锁-余额不足 | coin_balance < 所需 | 抛 BusinessException，不扣币 |
| L3-U-08 | 解锁-余额刚好够 | coin_balance == 所需 | 扣币成功，余额变0 |
| L3-U-09 | 解锁后余额正确 | 初始100币，解锁花10币 | balance_after=90 |
| L3-U-10 | 消费流水写入正确 | 解锁完成 | flow_type=consume, change_amount 为负数, biz_scene 正确 |
| L3-U-11 | 解锁幂等（同用户同目标同场景） | 已解锁过 | 取决于业务规则：抛异常或返回已有记录 |

### 3.3 VIP 模块 (VipServiceTest)

| 编号 | 用例 | 前置条件 | 预期 |
|------|------|---------|------|
| L3-V-01 | 查询已启用套餐 | 3个套餐（2启用1停用） | 只返回2个，按 sort_order 排序 |
| L3-V-02 | 查询权益列表 | 5个权益（4启用1停用） | 只返回4个，按 display_order 排序 |
| L3-V-03 | 查询 VIP 状态-未开通 | 无 asset 或 vip_status=inactive | vipStatus=inactive |
| L3-V-04 | 查询 VIP 状态-已开通 | vip_status=active | vipStatus=active, 含到期时间 |
| L3-V-05 | 查询 VIP 状态-已过期 | vip_status=expired | vipStatus=expired |
| L3-V-06 | 查询 VIP 订单记录 | 2笔 VIP 订单 | 分页返回2笔，按时间倒序 |

### 3.4 资产模块 (AssetService/CointServiceTest)

| 编号 | 用例 | 前置条件 | 预期 |
|------|------|---------|------|
| L3-A-01 | 查询资产摘要 | 已开通 VIP，余额 180 | vipStatus/expireTime/coinBalance/whisperRemain 正确 |
| L3-A-02 | 查询成家币余额 | 余额 180 | coinBalance=180 |
| L3-A-03 | 查询成家币流水-分页 | 25 条流水 | 第1页20条，第2页5条 |
| L3-A-04 | 流水按类型筛选 | 充值+消费混合 | 筛选后只返回匹配类型 |
| L3-A-05 | CoinLogService 入账 | 调用 addCoin | coin_balance 增加，流水写入 |

### 3.5 后台管理模块 (AdminServiceTest)

| 编号 | 用例 | 前置条件 | 预期 |
|------|------|---------|------|
| L3-AD-01 | VIP 套餐 CRUD | 新增→查询→编辑→停用 | 每步操作正确 |
| L3-AD-02 | 成家币套餐 CRUD | 新增→查询→编辑→停用 | 每步操作正确 |
| L3-AD-03 | VIP 权益 CRUD | 新增→查询→编辑→停用 | 每步操作正确 |
| L3-AD-04 | 财务订单列表-多条件筛选 | 各种类型/状态订单 | 筛选结果正确 |
| L3-AD-05 | 财务订单列表-金额范围筛选 | 不同金额订单 | 范围筛选正确 |
| L3-AD-06 | 流水列表-按用户筛选 | 多用户流水 | 只返回目标用户流水 |
| L3-AD-07 | 退款处理 | success订单 | order_status→refunding→refunded，退回成家币 |
| L3-AD-08 | 退款-订单非 success | unpaid/closed 订单 | 抛 BusinessException |
| L3-AD-09 | 日统计 | 当天有5笔VIP+3笔币订单 | 统计数字正确 |

## 4. L2 MockMvc Controller 测试用例

| 编号 | 用例 | 预期 |
|------|------|------|
| L2-01 | Controller 路由正确 | 各 URL 可访问，返回 200 |
| L2-02 | @RequirePermission 生效 | 无权限 token 返回 403 |
| L2-03 | 参数校验-必填字段 | 缺少必填字段返回 400 |
| L2-04 | 参数校验-枚举值 | 非法枚举值返回 400 |
| L2-05 | 返回结构统一为 R<T> | code/data/msg 字段齐全 |
| L2-06 | 分页参数默认值 | 不传 page/size 使用默认值 |

## 5. L4 Playwright E2E 测试用例

| 编号 | 用例 | 操作步骤 | 预期 |
|------|------|---------|------|
| L4-01 | VIP 权益配置页 | 登录→配置管理→VIP权益→新增→编辑→启停 | 每步操作成功，列表刷新 |
| L4-02 | VIP 套餐配置页 | 登录→配置管理→VIP套餐→新增→编辑→启停 | 同上 |
| L4-03 | 成家币套餐配置页 | 登录→配置管理→币套餐→新增→编辑→启停 | 同上 |
| L4-04 | 财务订单列表 | 登录→财务中心→订单管理→筛选→查看详情 | 列表/筛选/详情正确展示 |
| L4-05 | 财务流水列表 | 登录→财务中心→流水管理→筛选 | 流水数据正确 |
| L4-06 | 退款处理流程 | 登录→财务中心→退款管理→发起退款 | 退款成功，订单状态变更 |
| L4-07 | 权限控制 | 无权限角色登录→访问财务中心 | 提示无权限 |

## 6. 测试数据准备

测试前需通过 SQL 种子脚本准备：

1. **VIP 套餐数据**：月卡(30天/¥19.9)、季卡(90天/¥49.9)、年卡(365天/¥149.9)
2. **成家币套餐数据**：6元(60币)、18元(180币)、30元(360币)、68元(800币)
3. **VIP 权益数据**：每日额外配额、全量查看、免费悄悄话、高级筛选、隐藏访问
4. **测试用户**：至少 2 个测试用户，一个有资产记录，一个无
5. **测试角色**：超管角色（全权限）、普通运营角色（仅有 list 权限）
