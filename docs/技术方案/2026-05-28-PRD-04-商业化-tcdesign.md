# PRD-04 商业化（VIP、成家币、解锁与资产中心）技术方案设计

> 日期：2026-05-28
> 关联需求：
> - `docs/需求文档/移动端/细化PRD-04_商业化（VIP、成家币、解锁与资产中心）.md`
> - `docs/需求文档/管理后台/管理后台细化PRD-04_商业化（VIP、成家币、解锁与资产管理后台）.md`
> - `docs/需求文档/移动端/细化PRD-07_推广裂变与邀请奖励.md`
> - `docs/技术方案/2026-06-16-PRD-07推广裂变与邀请奖励正式版-tcdesign.md`

## 1. 背景与目标

PRD-04 承接成家立业小程序的核心商业化能力，拆成两条业务线：

1. **移动端商业化**：VIP 会员购买、成家币充值、资产中心、按次解锁消费、支付结果承接。
2. **管理后台商业化**：VIP/成家币套餐配置、用户资产管理、财务中心（订单/流水/退款/轻量对账）、商业化参数配置。

核心目标：

| 目标 | 技术承接 |
| --- | --- |
| VIP 会员订阅与权益生效 | VIP 套餐配置 → 下单 → 模拟支付 → 更新用户资产 → 权益即时生效 |
| 成家币充值消费闭环 | 币套餐配置 → 下单 → 支付 → 写流水 → 更新余额 |
| 按次解锁（喜欢我的/看过我的/理想型/精选） | 统一解锁接口 → 扣币校验 → 写解锁记录 → 写消费流水 |
| 财务后台查询与对账 | 订单/流水/退款列表、轻量日统计 |
| PRD-07 成家币奖励入账 | 落表 `app_user_coin_log`，提供 `CoinLogService` 统一入账入口供 PRD-07 调用 |
| 首版模拟支付 | 不接真实微信支付，Mock 支付回调让全链路跑通 |

## 2. 范围

| 模块 | 是否涉及 | 说明 |
| --- | --- | --- |
| 管理后台前端 | 是 | 新增财务中心（订单/流水/退款）、用户详情商业化 Tab、套餐配置页面 |
| 管理后台后端 | 是 | 新增套餐配置、财务查询、用户资产查询、参数配置接口 |
| 小程序后端 | 是 | 新增 VIP/成家币/资产/解锁/支付接口 |
| 小程序前端 | 否 | 本仓库不包含，仅输出接口契约 |
| 数据库 | 是 | 新增 VIP 权益/套餐、成家币套餐、用户资产、交易订单、成家币流水、解锁记录等表 |
| 微信支付 | 否 | 首版使用模拟支付，订单回调由 Mock 接口触发 |
| 退款审批流 | 否 | 首版仅支持查询和状态标记，不做复杂审批工作流 |

## 3. 关键决策与待确认项

| 类型 | 内容 | 决策/状态 | 来源 |
| --- | --- | --- | --- |
| 已确认 | 支付对接方式 | 首版使用模拟支付（Mock），后续替换真实微信支付 | 用户确认 |
| 已确认 | 成家币不过期 | 所有成家币（充值/赠送/退款）均不过期 | PRD-04 |
| 已确认 | 用户侧不拆分双余额池 | 只展示一个总余额，后台流水区分来源（充值/赠送/退款） | PRD-04 |
| 已确认 | VIP 到期回退 | 到期后即时回退普通态；额外配额、全量查看、高级筛选、隐藏访问即时失效 | PRD-04 |
| 已确认 | 已单条购买的记录永久可见 | VIP 到期后单条解锁记录不失效 | PRD-04 |
| 已确认 | 未认证用户可购买资产 | 但社交权益需等三项认证通过后实际生效 | PRD-04 |
| 已确认 | 前台不开放主动退款 | 仅后台特批退款 | PRD-04 |
| 已确认 | 理想型批量解锁 | 单次最多勾选 5 个，VIP 也照常扣币 | PRD-04 |
| 已确认 | 解锁保留期 | 理想型 90 天，精选主页 3 天，后台可配 | PRD-04 |
| 待联动 | PRD-07 成家币奖励入账 | `promotion_reward_log.coin_log_id` 引用本模块 `app_user_coin_log.id` | PRD-07 技术方案 |
| 待联动 | 用户与三项认证表 | 用户表和认证表尚未落表，PRD-04 的 user_id 外键暂时不设物理约束 | 代码现状 |
| 待联动 | 通知中心 | PRD-03 通知中心尚未实现，充值成功/VIP到期等通知暂不接入 | 代码现状 |

## 4. 总体架构与调用链

### 4.1 VIP 购买链路

```text
小程序 VIP 会员中心
  → GET /miniapp/vip/packages  查询套餐列表
  → GET /miniapp/vip/benefits  查询权益列表
  → POST /miniapp/payment/create-order  创建订单（order_type=vip）
  → POST /miniapp/payment/mock-pay/{orderId}  模拟支付
  → 后端处理：
      - 更新 trade_order 状态 → success
      - 更新/创建 user_asset：vip_status=active，vip_expire_time=now+durationDays
      - 记录 vip_order 扩展信息
  → 返回支付成功，权益即时生效
```

### 4.2 成家币充值链路

```text
小程序成家币充值页
  → GET /miniapp/coin/packages  查询套餐列表
  → POST /miniapp/payment/create-order  创建订单（order_type=coin）
  → POST /miniapp/payment/mock-pay/{orderId}  模拟支付
  → 后端处理：
      - 更新 trade_order 状态 → success
      - 更新 user_asset.coin_balance += coinCount + bonusCoinCount
      - 写 app_user_coin_log（flow_type=recharge）
  → 返回支付成功，余额即时刷新
```

### 4.3 按次解锁消费链路

```text
小程序业务场景（喜欢我的/看过我的/理想型/精选）
  → POST /miniapp/asset/unlock  统一解锁接口
  → 后端处理：
      - 校验成家币余额是否充足
      - 余额不足 → 返回错误码，前端弹出充值引导
      - 余额充足 → 扣减 user_asset.coin_balance
      - 写 app_user_coin_log（flow_type=consume）
      - 写 app_user_unlock_record
  → 返回解锁成功
```

### 4.4 管理后台链路

```text
frontend/src/pages/finance/*  财务中心
frontend/src/pages/config/*   套餐配置
  → frontend/src/api/finance.ts, vip.ts, coin.ts
  → /admin/finance/**, /admin/vip/**, /admin/coin/**
  → *Controller → *Service → *ServiceImpl → *Dao → *DaoImpl → *Mapper → MySQL
```

## 5. 方案选择

| 方案 | 说明 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- | --- |
| 最小方案 | VIP/币套餐用字典配置，订单/流水各一张表 | 交付快 | 套餐配置不灵活，流水无法区分来源，扩展性差 | 不选 |
| 平衡方案 | 套餐独立表、资产/订单/流水/解锁分表、模拟支付 | 满足 PRD-04 全量需求，符合六层架构 | 表较多但边界清晰 | **选择** |
| 完整方案 | 接入真实微信支付、退款审批流、财务对账系统 | 生产可用 | 超出首版范围，微信支付商户号等前置条件未满足 | 后续再做 |

本方案采用**平衡方案**：套餐、资产、订单、流水、解锁各自独立建表；支付使用 Mock 接口模拟；所有逻辑在 Spring Boot 单体内同步处理，关键写操作加 `@Transactional`。

## 6. 数据库设计

### 6.1 表清单

| 表名 | 说明 |
| --- | --- |
| `app_vip_benefit` | VIP 权益项配置 |
| `app_vip_package` | VIP 套餐配置 |
| `app_coin_package` | 成家币套餐配置 |
| `app_user_asset` | 用户资产汇总（每用户一条） |
| `app_trade_order` | 交易订单（VIP + 成家币统一） |
| `app_user_coin_log` | 成家币流水（PRD-07 依赖此表） |
| `app_user_unlock_record` | 解锁记录 |

### 6.2 关键 DDL

> 所有表包含通用字段：`create_time/update_time/created_by/updated_by/deleted`（TINYINT DEFAULT 0）。
> Java 实体统一继承 `BaseEntity`。下仅列业务字段与索引。

```sql
-- VIP 权益配置表
CREATE TABLE app_vip_benefit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    benefit_code VARCHAR(50) NOT NULL COMMENT '权益编码',
    benefit_name VARCHAR(100) NOT NULL COMMENT '权益名称',
    benefit_type VARCHAR(30) NOT NULL COMMENT '权益类型: quota/unlock/exposure/privacy/message',
    benefit_desc VARCHAR(500) DEFAULT NULL COMMENT '权益文案',
    display_order INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT 'ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_benefit_code (benefit_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='VIP权益配置表';

-- VIP 套餐配置表
CREATE TABLE app_vip_package (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    package_name VARCHAR(100) NOT NULL COMMENT '套餐名称',
    package_type VARCHAR(30) NOT NULL DEFAULT 'normal' COMMENT 'normal=普通套餐, subscribe=连续订阅',
    price DECIMAL(10,2) NOT NULL COMMENT '售价',
    origin_price DECIMAL(10,2) DEFAULT NULL COMMENT '原价',
    duration_days INT NOT NULL COMMENT '有效天数',
    recommend_flag TINYINT DEFAULT 0 COMMENT '是否推荐',
    package_tag VARCHAR(50) DEFAULT NULL COMMENT '标签: 热销/推荐/省钱',
    sort_order INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT 'ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='VIP套餐配置表';

-- 成家币套餐配置表
CREATE TABLE app_coin_package (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    package_name VARCHAR(100) NOT NULL COMMENT '套餐名称',
    amount DECIMAL(10,2) NOT NULL COMMENT '支付金额',
    coin_count INT NOT NULL COMMENT '到账币数',
    bonus_coin_count INT DEFAULT 0 COMMENT '赠送币数',
    recommend_flag TINYINT DEFAULT 0 COMMENT '是否推荐',
    package_tag VARCHAR(50) DEFAULT NULL COMMENT '标签: 热销/推荐/低价特惠/尝新首选/最多人选/节省最多',
    package_desc VARCHAR(500) DEFAULT NULL COMMENT '优惠说明',
    sort_order INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT 'ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成家币套餐配置表';

-- 用户资产表（每用户一条记录）
CREATE TABLE app_user_asset (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    vip_status VARCHAR(20) DEFAULT 'inactive' COMMENT 'inactive/active/expired',
    vip_expire_time DATETIME DEFAULT NULL COMMENT 'VIP到期时间',
    coin_balance INT DEFAULT 0 COMMENT '成家币余额',
    today_free_whisper_remain INT DEFAULT 0 COMMENT '今日免费悄悄话剩余次数',
    total_recharge DECIMAL(10,2) DEFAULT 0 COMMENT '累计充值金额',
    last_consume_time DATETIME DEFAULT NULL COMMENT '最近消费时间',
    last_purchase_time DATETIME DEFAULT NULL COMMENT '最近购买时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户资产表';

-- 交易订单表（VIP + 成家币统一）
CREATE TABLE app_trade_order (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(64) NOT NULL COMMENT '订单号',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    order_type VARCHAR(20) NOT NULL COMMENT 'vip/coin',
    package_id BIGINT NOT NULL COMMENT '套餐ID',
    package_name VARCHAR(100) DEFAULT NULL COMMENT '套餐名称（冗余）',
    pay_amount DECIMAL(10,2) NOT NULL COMMENT '支付金额',
    order_status VARCHAR(20) DEFAULT 'unpaid' COMMENT 'unpaid/success/closed/failed/refunding/refunded',
    success_time DATETIME DEFAULT NULL COMMENT '支付成功时间',
    expire_time DATETIME DEFAULT NULL COMMENT 'VIP到期时间（仅VIP订单）',
    refund_time DATETIME DEFAULT NULL COMMENT '退款完成时间',
    refund_reason VARCHAR(500) DEFAULT NULL COMMENT '退款原因',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_order_no (order_no),
    INDEX idx_user_type_status (user_id, order_type, order_status),
    INDEX idx_status_time (order_status, create_time),
    INDEX idx_success_time (success_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='交易订单表';

-- 成家币流水表
CREATE TABLE app_user_coin_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    flow_no VARCHAR(64) NOT NULL COMMENT '流水号',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    flow_type VARCHAR(20) NOT NULL COMMENT 'recharge=充值/consume=消费/gift=赠送/refund=退款退回',
    change_amount INT NOT NULL COMMENT '变动数量（正数增加，负数减少）',
    balance_after INT NOT NULL COMMENT '变动后余额',
    biz_scene VARCHAR(50) NOT NULL COMMENT '业务场景: vip_purchase/coin_recharge/whisper/likes_unlock/viewers_unlock/ideal_unlock/featured_unlock/promotion_reward/refund_return',
    biz_desc VARCHAR(200) DEFAULT NULL COMMENT '业务说明',
    ref_id BIGINT DEFAULT NULL COMMENT '关联业务ID',
    ref_type VARCHAR(50) DEFAULT NULL COMMENT '关联业务类型: trade_order/unlock_record/promotion_reward',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_flow_no (flow_no),
    INDEX idx_user_time (user_id, create_time),
    INDEX idx_ref (ref_id, ref_type),
    INDEX idx_scene_time (biz_scene, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成家币流水表';

-- 解锁记录表
CREATE TABLE app_user_unlock_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID（发起解锁者）',
    target_user_id BIGINT DEFAULT NULL COMMENT '被解锁用户ID',
    unlock_scene VARCHAR(50) NOT NULL COMMENT 'likes/viewers/ideal_user/featured_profile',
    unlock_method VARCHAR(20) NOT NULL COMMENT 'vip/coin',
    coin_cost INT DEFAULT 0 COMMENT '消耗成家币数',
    effective_time DATETIME NOT NULL COMMENT '生效时间',
    expire_time DATETIME DEFAULT NULL COMMENT '失效时间',
    status VARCHAR(20) DEFAULT 'active' COMMENT 'active/expired',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_user_scene (user_id, unlock_scene, status),
    INDEX idx_target (target_user_id),
    INDEX idx_expire (expire_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='解锁记录表';
```

### 6.3 枚举与字典

| 字典类型 | 值 |
| --- | --- |
| `vip_status` | `inactive/active/expired` |
| `vip_package_type` | `normal/subscribe` |
| `vip_benefit_type` | `quota/unlock/exposure/privacy/message` |
| `order_type` | `vip/coin` |
| `order_status` | `unpaid/success/closed/failed/refunding/refunded` |
| `coin_flow_type` | `recharge/consume/gift/refund` |
| `biz_scene` | `vip_purchase/coin_recharge/whisper/likes_unlock/viewers_unlock/ideal_unlock/featured_unlock/promotion_reward/refund_return` |
| `unlock_scene` | `likes/viewers/ideal_user/featured_profile` |
| `unlock_method` | `vip/coin` |
| `package_tag` | `hot/recommend/save/budget/first_choice/most_popular/most_save` |

## 7. 后端设计

### 7.1 包与类规划

| 层 | 路径/类 | 说明 |
| --- | --- | --- |
| Entity | `common/entity/VipBenefit.java` 等 | 7 个实体统一放 common |
| Enum | `common/enums/OrderStatusEnum.java` 等 | 订单状态、流水类型等枚举 |
| Mapper | `common/mapper/VipBenefitMapper.java` 等 | 继承 `BaseMapper<T>` |
| DAO | `common/dao/VipBenefitDao.java` | 数据访问接口 |
| DAOImpl | `common/dao/impl/VipBenefitDaoImpl.java` | 只在此层注入 Mapper |
| Admin Controller | `admin/controller/VipPackageController.java` | 套餐 CRUD |
| Admin Controller | `admin/controller/CoinPackageController.java` | 币套餐 CRUD |
| Admin Controller | `admin/controller/VipBenefitController.java` | 权益配置 |
| Admin Controller | `admin/controller/FinanceOrderController.java` | 订单列表/详情 |
| Admin Controller | `admin/controller/FinanceFlowController.java` | 流水列表 |
| Admin Controller | `admin/controller/FinanceRefundController.java` | 退款处理 |
| Admin Controller | `admin/controller/FinanceStatsController.java` | 轻量对账统计 |
| Admin Service | `admin/service/VipPackageAdminService.java` | 后台套餐业务 |
| Admin Service | `admin/service/CoinPackageAdminService.java` | 后台币套餐业务 |
| Admin Service | `admin/service/FinanceAdminService.java` | 财务中心业务 |
| Miniapp Controller | `miniapp/controller/VipController.java` | 小程序 VIP 接口 |
| Miniapp Controller | `miniapp/controller/CoinController.java` | 小程序成家币接口 |
| Miniapp Controller | `miniapp/controller/AssetController.java` | 小程序资产/解锁接口 |
| Miniapp Controller | `miniapp/controller/PaymentController.java` | 小程序支付接口 |
| Miniapp Service | `miniapp/service/VipService.java` | VIP 业务 |
| Miniapp Service | `miniapp/service/CoinService.java` | 成家币业务 |
| Miniapp Service | `miniapp/service/AssetService.java` | 资产/解锁业务 |
| Miniapp Service | `miniapp/service/PaymentService.java` | 支付业务（含模拟支付） |
| Common Service | `common/service/CoinLogService.java` | 成家币流水统一写入入口（供 PRD-07 调用） |

注意：`admin/` 和 `miniapp/` 不互相 import；共享逻辑（如 `CoinLogService`）下沉到 `common/`。

### 7.2 小程序接口

| 功能 | URL | Method | 权限 | 入参 | 出参 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| VIP 套餐列表 | `/miniapp/vip/packages` | GET | 登录 | 无 | `List<VipPackageVO>` | 只返回 status=ENABLED |
| VIP 权益列表 | `/miniapp/vip/benefits` | GET | 登录 | 无 | `List<VipBenefitVO>` | 只返回 status=ENABLED |
| VIP 状态 | `/miniapp/vip/status` | GET | 登录 | 无 | `VipStatusVO` | 当前 VIP 状态+到期时间 |
| VIP 订单记录 | `/miniapp/vip/orders` | GET | 登录 | `page,size` | `Page<VipOrderVO>` | 当前用户的 VIP 订单 |
| 成家币套餐列表 | `/miniapp/coin/packages` | GET | 登录 | 无 | `List<CoinPackageVO>` | 只返回 status=ENABLED |
| 成家币余额 | `/miniapp/coin/balance` | GET | 登录 | 无 | `CoinBalanceVO` | 当前余额 |
| 成家币流水 | `/miniapp/coin/flows` | GET | 登录 | `page,size` | `Page<CoinFlowVO>` | 分页流水 |
| 资产摘要 | `/miniapp/asset/summary` | GET | 登录 | 无 | `AssetSummaryVO` | VIP状态+余额+悄悄话次数 |
| 创建订单 | `/miniapp/payment/create-order` | POST | 登录 | `CreateOrderReq` | `CreateOrderVO` | 返回 orderId |
| 模拟支付 | `/miniapp/payment/mock-pay/{orderId}` | POST | 登录 | 无 | `PayResultVO` | 模拟支付成功 |
| 统一解锁 | `/miniapp/asset/unlock` | POST | 登录 | `UnlockReq` | `UnlockVO` | 单条/批量解锁统一入口 |
| 解锁记录 | `/miniapp/asset/unlock-records` | GET | 登录 | `page,size,scene` | `Page<UnlockRecordVO>` | 当前用户的解锁记录 |

### 7.3 管理后台接口

#### 7.3.1 VIP 权益与套餐配置

| 功能 | URL | Method | 权限码 | 入参 | 出参 |
| --- | --- | --- | --- | --- | --- |
| 权益列表 | `/admin/vip/benefits/list` | GET | `vip:benefit:list` | 无 | `List<VipBenefitVO>` |
| 权益详情 | `/admin/vip/benefits/{id}` | GET | `vip:benefit:list` | `id` | `VipBenefitVO` |
| 新增权益 | `/admin/vip/benefits` | POST | `vip:benefit:add` | `VipBenefitSaveReq` | `Long` |
| 编辑权益 | `/admin/vip/benefits/{id}` | PUT | `vip:benefit:edit` | `VipBenefitSaveReq` | `Void` |
| 启停权益 | `/admin/vip/benefits/{id}/status` | PUT | `vip:benefit:edit` | `StatusUpdateReq` | `Void` |
| 套餐列表 | `/admin/vip/packages/list` | GET | `vip:package:list` | 无 | `List<VipPackageVO>` |
| 套餐详情 | `/admin/vip/packages/{id}` | GET | `vip:package:list` | `id` | `VipPackageVO` |
| 新增套餐 | `/admin/vip/packages` | POST | `vip:package:add` | `VipPackageSaveReq` | `Long` |
| 编辑套餐 | `/admin/vip/packages/{id}` | PUT | `vip:package:edit` | `VipPackageSaveReq` | `Void` |
| 启停套餐 | `/admin/vip/packages/{id}/status` | PUT | `vip:package:edit` | `StatusUpdateReq` | `Void` |

#### 7.3.2 成家币套餐配置

| 功能 | URL | Method | 权限码 | 入参 | 出参 |
| --- | --- | --- | --- | --- | --- |
| 套餐列表 | `/admin/coin/packages/list` | GET | `coin:package:list` | 无 | `List<CoinPackageVO>` |
| 套餐详情 | `/admin/coin/packages/{id}` | GET | `coin:package:list` | `id` | `CoinPackageVO` |
| 新增套餐 | `/admin/coin/packages` | POST | `coin:package:add` | `CoinPackageSaveReq` | `Long` |
| 编辑套餐 | `/admin/coin/packages/{id}` | PUT | `coin:package:edit` | `CoinPackageSaveReq` | `Void` |
| 启停套餐 | `/admin/coin/packages/{id}/status` | PUT | `coin:package:edit` | `StatusUpdateReq` | `Void` |

#### 7.3.3 财务中心

| 功能 | URL | Method | 权限码 | 入参 | 出参 |
| --- | --- | --- | --- | --- | --- |
| 订单列表 | `/admin/finance/orders/list` | GET | `finance:order:list` | `OrderPageReq` | `Page<TradeOrderVO>` |
| 订单详情 | `/admin/finance/orders/{id}` | GET | `finance:order:list` | `id` | `TradeOrderDetailVO` |
| 流水列表 | `/admin/finance/flows/list` | GET | `finance:flow:list` | `FlowPageReq` | `Page<CoinFlowVO>` |
| 退款处理 | `/admin/finance/orders/{id}/refund` | PUT | `finance:refund:process` | `RefundReq` | `Void` |
| 退款列表 | `/admin/finance/refunds/list` | GET | `finance:refund:list` | `RefundPageReq` | `Page<TradeOrderVO>` |
| 日统计 | `/admin/finance/stats/daily` | GET | `finance:stats:view` | `date` | `DailyStatsVO` |

### 7.4 关键 DTO/VO 字段

| 对象 | 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `CreateOrderReq` | `orderType` | String | 是 | `vip/coin` |
| `CreateOrderReq` | `packageId` | Long | 是 | 套餐ID |
| `CreateOrderVO` | `orderId` | Long | 是 | 订单ID |
| `CreateOrderVO` | `orderNo` | String | 是 | 订单号 |
| `PayResultVO` | `orderNo` | String | 是 | 订单号 |
| `PayResultVO` | `orderStatus` | String | 是 | 支付后状态 |
| `PayResultVO` | `coinBalance` | Integer | 否 | 支付后余额（币订单） |
| `PayResultVO` | `vipExpireTime` | String | 否 | VIP到期时间（VIP订单） |
| `UnlockReq` | `unlockScene` | String | 是 | `likes/viewers/ideal_user/featured_profile` |
| `UnlockReq` | `targetUserIds` | List\<Long\> | 是 | 解锁目标用户ID列表（单条=1个） |
| `UnlockVO` | `unlockedCount` | Integer | 是 | 成功解锁数量 |
| `UnlockVO` | `coinCost` | Integer | 是 | 总消耗成家币 |
| `AssetSummaryVO` | `vipStatus` | String | 是 | `inactive/active/expired` |
| `AssetSummaryVO` | `vipExpireTime` | String | 否 | VIP到期时间 |
| `AssetSummaryVO` | `coinBalance` | Integer | 是 | 成家币余额 |
| `AssetSummaryVO` | `todayFreeWhisperRemain` | Integer | 是 | 今日免费悄悄话剩余 |
| `OrderPageReq` | `orderNo` | String | 否 | 订单号筛选 |
| `OrderPageReq` | `userId` | Long | 否 | 用户ID筛选 |
| `OrderPageReq` | `orderType` | String | 否 | `vip/coin` |
| `OrderPageReq` | `orderStatus` | String | 否 | 订单状态 |
| `OrderPageReq` | `payAmountMin/Max` | BigDecimal | 否 | 金额范围 |
| `FlowPageReq` | `userId` | Long | 否 | 用户ID |
| `FlowPageReq` | `flowType` | String | 否 | 流水类型 |
| `FlowPageReq` | `bizScene` | String | 否 | 业务场景 |

### 7.5 模拟支付设计

```
POST /miniapp/payment/mock-pay/{orderId}

流程：
1. 查询 trade_order，校验状态为 unpaid
2. 根据 order_type 分支处理：
   - vip:
     a. 计算 expire_time = now + vip_package.duration_days
     b. 更新 trade_order: order_status='success', success_time=now, expire_time=计算值
     c. 查询或创建 user_asset，更新 vip_status='active', vip_expire_time=计算值, total_recharge+=金额, last_purchase_time=now
   - coin:
     a. 更新 trade_order: order_status='success', success_time=now
     b. 查询或创建 user_asset，更新 coin_balance+=总币数, total_recharge+=金额, last_purchase_time=now
     c. 写 app_user_coin_log: flow_type='recharge', change_amount=+总币数
3. 返回 PayResultVO

幂等：已 success 的订单直接返回当前状态
事务：整个支付处理在 @Transactional 内完成
```

### 7.6 统一解锁逻辑

```
POST /miniapp/asset/unlock

流程：
1. 校验参数：批量解锁 ideal_user 时 targetUserIds.size() <= 5
2. 根据 unlock_scene 查单价（从配置/参数获取，首版硬编码后迁移到配置表）
3. 计算总消耗 = 单价 × 数量
4. 查询 user_asset，校验 coin_balance >= 总消耗
5. 扣减 coin_balance
6. 批量写 app_user_unlock_record（根据 scene 设置不同的 expire_time）
7. 写 app_user_coin_log（flow_type='consume'）
8. 返回结果

保留期:
- likes/viewers: 永久（expire_time=NULL）
- ideal_user: 90 天
- featured_profile: 3 天
```

### 7.7 CoinLogService 统一入口（供 PRD-07 调用）

```java
// common/service/CoinLogService.java
public interface CoinLogService {
    /**
     * 统一成家币入账入口
     * @param userId  用户ID
     * @param amount  入账币数（正数）
     * @param bizScene 业务场景
     * @param refId   关联业务ID（如 promotion_reward_log.id）
     * @param refType 关联业务类型
     * @return coin_log.id
     */
    Long addCoin(Long userId, Integer amount, String bizScene, Long refId, String refType);
}
```

PRD-07 的 `PromotionRewardLog` 中 `coin_log_id` 字段即为此方法返回的 `app_user_coin_log.id`。

## 8. 前端设计

### 8.1 路由与页面

| 页面 | 路由 | 组件 | 权限 |
| --- | --- | --- | --- |
| 订单管理 | `/finance/orders` | `pages/finance/FinanceManagement.tsx` | `finance:order:list` |
| 流水管理 | `/finance/flows` | `pages/finance/FinanceManagement.tsx` | `finance:flow:list` |
| 退款管理 | `/finance/refunds` | `pages/finance/FinanceManagement.tsx` | `finance:refund:list` |
| VIP 权益配置 | `/config/vip-benefits` | `pages/config/VipBenefitManagement.tsx` | `vip:benefit:list` |
| VIP 套餐配置 | `/config/vip-packages` | `pages/config/VipPackageManagement.tsx` | `vip:package:list` |
| 成家币套餐配置 | `/config/coin-packages` | `pages/config/CoinPackageManagement.tsx` | `coin:package:list` |

财务中心沿用推广模块的 Tab 切换模式，`FinanceManagement.tsx` 通过顶部 Tab 切换订单/流水/退款三个子页面。

### 8.2 用户详情商业化 Tab

在现有用户详情页增加商业化相关 Tab，需要在现有 `UserManagement.tsx` 或独立用户详情组件中扩展：

1. **商业化摘要**：VIP 状态、到期时间、成家币余额、累计充值、免费悄悄话剩余
2. **会员订单 Tab**：查询 `GET /admin/finance/orders/list?userId=xxx&orderType=vip`
3. **成家币流水 Tab**：查询 `GET /admin/finance/flows/list?userId=xxx`
4. **解锁记录 Tab**：查询 `GET /admin/asset/unlock-records?userId=xxx`
5. **退款记录 Tab**：查询 `GET /admin/finance/refunds/list?userId=xxx`

### 8.3 API 模块

新增前端 API 模块：
- `frontend/src/api/vip.ts` — VIP 权益/套餐后台接口
- `frontend/src/api/coin.ts` — 成家币套餐后台接口
- `frontend/src/api/finance.ts` — 财务中心接口

## 9. 权限与菜单

### 9.1 菜单树

| 菜单 | 类型 | 路由 | 组件 | 权限 |
| --- | --- | --- | --- | --- |
| 财务中心 | M | - | - | - |
| 订单管理 | C | `/finance/orders` | `finance/FinanceManagement` | `finance:order:list` |
| 流水管理 | C | `/finance/flows` | `finance/FinanceManagement` | `finance:flow:list` |
| 退款管理 | C | `/finance/refunds` | `finance/FinanceManagement` | `finance:refund:list` |
| 移动端配置管理 | M | - | - | - |
| VIP 权益配置 | C | `/config/vip-benefits` | `config/VipBenefitManagement` | `vip:benefit:list` |
| VIP 套餐配置 | C | `/config/vip-packages` | `config/VipPackageManagement` | `vip:package:list` |
| 成家币套餐配置 | C | `/config/coin-packages` | `config/CoinPackageManagement` | `coin:package:list` |

### 9.2 按钮权限

| 权限码 | 说明 |
| --- | --- |
| `vip:benefit:add` | 新增 VIP 权益 |
| `vip:benefit:edit` | 编辑/启停 VIP 权益 |
| `vip:package:add` | 新增 VIP 套餐 |
| `vip:package:edit` | 编辑/启停 VIP 套餐 |
| `coin:package:add` | 新增成家币套餐 |
| `coin:package:edit` | 编辑/启停成家币套餐 |
| `finance:order:list` | 查看订单列表 |
| `finance:flow:list` | 查看流水列表 |
| `finance:refund:list` | 查看退款列表 |
| `finance:refund:process` | 处理退款（特批） |
| `finance:stats:view` | 查看财务统计 |

## 10. 与其他模块联动

| 模块 | 联动点 | 设计 |
| --- | --- | --- |
| PRD-07 推广裂变 | 成家币奖励入账 | 提供 `CoinLogService.addCoin()` 统一入口，PRD-07 调用后 `promotion_reward_log.coin_log_id` 回填 |
| 用户模块 | 用户ID关联 | `app_user_asset.user_id`、`app_trade_order.user_id` 关联用户表，暂不设物理外键 |
| 三项认证 | 权益生效判断 | PRD-04 不校验认证状态，由业务模块调用前自行判断；资产购买不受认证限制 |
| 通知中心 | 充值/VIP到期通知 | 当前暂不接入，待 PRD-03 实现后补充 |
| 字典管理 | 枚举值维护 | 复用现有 `sys_dict_type/sys_dict_data` 体系维护商业化枚举 |

### 10.1 跨 PRD 联调契约

| 依赖 PRD/模块 | PRD-04 需要的能力 | PRD-04 提供给对方的接口 |
| --- | --- | --- |
| PRD-07 推广裂变 | 无（PRD-04 是基础设施） | `CoinLogService.addCoin(userId, amount, "promotion_reward", rewardLogId, "promotion_reward")` |
| PRD-03 通知中心 | 无（暂不接入） | 支付成功/VIP到期等事件预留通知写入点 |
| 用户模块 | 用户表存在、userId 可用 | 提供资产摘要查询接口 |

## 11. 测试方案

| 层级 | 覆盖内容 | 产物 |
| --- | --- | --- |
| L1 cURL | 小程序 VIP/币套餐查询、创建订单、模拟支付、资产查询、解锁；后台套餐 CRUD、财务列表 | `docs/测试文档/商业化-test-l1.sh` |
| L2 MockMvc | Controller 路由、`@RequirePermission`、参数校验、返回 `R<T>` | `backend/src/test/java/com/spacetime/admin/controller/VipPackageControllerTest.java` 等 |
| L3 JUnit | 支付流程、解锁扣币、余额不足、幂等、批量解锁限制、流水写入 | `backend/src/test/java/com/spacetime/miniapp/service/PaymentServiceTest.java` 等 |
| L4 Playwright | 后台套餐配置、财务中心列表/筛选、退款处理 | `frontend/e2e-tests/tests/commercial.spec.ts` |

### 11.1 必测用例

| 场景 | 预期 |
| --- | --- |
| 查询 VIP 套餐列表 | 只返回已启用套餐，按 sort_order 排序 |
| 创建 VIP 订单 | 返回订单号，状态 unpaid |
| 模拟支付 VIP 订单 | 订单→success，资产 vip_status→active，设置到期时间 |
| 模拟支付成家币订单 | 订单→success，余额增加（含赠送币），写流水 |
| 重复支付同一订单 | 幂等返回当前状态，不重复入账 |
| 解锁-余额充足 | 扣币成功，写解锁记录+消费流水 |
| 解锁-余额不足 | 返回错误，不扣币，不写记录 |
| 批量解锁理想型 | 超过5个返回参数错误 |
| 查询资产摘要 | 返回 VIP 状态、余额、免费悄悄话次数 |
| 后台订单列表筛选 | 按类型/状态/时间/金额范围筛选正确 |
| 后台退款处理 | 订单状态→refunding→refunded，退回成家币 |
| 无权限访问后台接口 | 返回 403 |

## 12. 变更文件清单

### 12.1 后端

| 类型 | 文件路径 | 新增/修改 | 说明 |
| --- | --- | --- | --- |
| SQL | `backend/docs/sql/schema-commercial.sql` | 新增 | 商业化模块 DDL + 菜单权限种子数据 |
| Entity | `common/entity/VipBenefit.java` | 新增 | VIP 权益实体 |
| Entity | `common/entity/VipPackage.java` | 新增 | VIP 套餐实体 |
| Entity | `common/entity/CoinPackage.java` | 新增 | 成家币套餐实体 |
| Entity | `common/entity/UserAsset.java` | 新增 | 用户资产实体 |
| Entity | `common/entity/TradeOrder.java` | 新增 | 交易订单实体 |
| Entity | `common/entity/UserCoinLog.java` | 新增 | 成家币流水实体 |
| Entity | `common/entity/UserUnlockRecord.java` | 新增 | 解锁记录实体 |
| Enum | `common/enums/OrderStatusEnum.java` | 新增 | 订单状态枚举 |
| Enum | `common/enums/FlowTypeEnum.java` | 新增 | 流水类型枚举 |
| Enum | `common/enums/BizSceneEnum.java` | 新增 | 业务场景枚举 |
| Mapper | `common/mapper/VipBenefitMapper.java` 等 7 个 | 新增 | MyBatis-Plus Mapper |
| DAO | `common/dao/VipBenefitDao.java` 等 7 个 | 新增 | 数据访问接口 |
| DAOImpl | `common/dao/impl/VipBenefitDaoImpl.java` 等 7 个 | 新增 | 数据访问实现 |
| Common Service | `common/service/CoinLogService.java` + impl | 新增 | 统一入账入口 |
| Admin DTO | `admin/dto/request/VipBenefitSaveReq.java` 等 | 新增 | 后台入参 |
| Admin VO | `admin/dto/response/VipBenefitVO.java` 等 | 新增 | 后台出参 |
| Admin Controller | `admin/controller/VipBenefitController.java` | 新增 | 权益 CRUD |
| Admin Controller | `admin/controller/VipPackageController.java` | 新增 | VIP 套餐 CRUD |
| Admin Controller | `admin/controller/CoinPackageController.java` | 新增 | 币套餐 CRUD |
| Admin Controller | `admin/controller/FinanceOrderController.java` | 新增 | 订单管理 |
| Admin Controller | `admin/controller/FinanceFlowController.java` | 新增 | 流水管理 |
| Admin Controller | `admin/controller/FinanceRefundController.java` | 新增 | 退款管理 |
| Admin Controller | `admin/controller/FinanceStatsController.java` | 新增 | 财务统计 |
| Admin Service | `admin/service/VipPackageAdminService.java` + impl | 新增 | 后台套餐业务 |
| Admin Service | `admin/service/CoinPackageAdminService.java` + impl | 新增 | 后台币套餐业务 |
| Admin Service | `admin/service/FinanceAdminService.java` + impl | 新增 | 财务中心业务 |
| Miniapp Controller | `miniapp/controller/VipController.java` | 新增 | 小程序 VIP |
| Miniapp Controller | `miniapp/controller/CoinController.java` | 新增 | 小程序成家币 |
| Miniapp Controller | `miniapp/controller/AssetController.java` | 新增 | 小程序资产/解锁 |
| Miniapp Controller | `miniapp/controller/PaymentController.java` | 新增 | 小程序支付 |
| Miniapp Service | `miniapp/service/VipService.java` + impl | 新增 | VIP 业务 |
| Miniapp Service | `miniapp/service/CoinService.java` + impl | 新增 | 成家币业务 |
| Miniapp Service | `miniapp/service/AssetService.java` + impl | 新增 | 资产/解锁业务 |
| Miniapp Service | `miniapp/service/PaymentService.java` + impl | 新增 | 支付业务 |
| Miniapp DTO | `miniapp/dto/request/CreateOrderReq.java` 等 | 新增 | 小程序入参 |
| Miniapp VO | `miniapp/dto/response/VipPackageVO.java` 等 | 新增 | 小程序出参 |

### 12.2 前端

| 类型 | 文件路径 | 新增/修改 | 说明 |
| --- | --- | --- | --- |
| API | `frontend/src/api/vip.ts` | 新增 | VIP 后台接口封装 |
| API | `frontend/src/api/coin.ts` | 新增 | 成家币后台接口封装 |
| API | `frontend/src/api/finance.ts` | 新增 | 财务中心接口封装 |
| 路由 | `frontend/src/router/index.tsx` | 修改 | 新增财务中心、配置管理路由 |
| 页面 | `frontend/src/pages/finance/FinanceManagement.tsx` | 新增 | 订单/流水/退款 Tab 页面 |
| 页面 | `frontend/src/pages/config/VipBenefitManagement.tsx` | 新增 | VIP 权益配置页 |
| 页面 | `frontend/src/pages/config/VipPackageManagement.tsx` | 新增 | VIP 套餐配置页 |
| 页面 | `frontend/src/pages/config/CoinPackageManagement.tsx` | 新增 | 成家币套餐配置页 |
| 页面 | `frontend/src/pages/admin/UserManagement.tsx` | 修改 | 用户详情增加商业化 Tab |

## 13. 风险与回滚

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| 用户表未落表 | user_id 关联无物理约束 | 暂不设外键，后续补 |
| 模拟支付与真实支付差异 | 后续切换真实支付需改造 | Mock 接口与真实接口保持相同入参/出参契约 |
| 成家币流水写入失败 | 余额与流水不一致 | 扣币操作与流水写入在同一事务内 |
| PRD-07 奖励入账时机 | 推广奖励无法到账 | CoinLogService 提前实现，PRD-07 直接调用 |
| 并发扣币 | 用户余额可能被扣为负 | 使用 `UPDATE app_user_asset SET coin_balance = coin_balance - ? WHERE user_id = ? AND coin_balance >= ?` 行级锁 |

回滚策略：
1. 关闭所有套餐 `status='DISABLED'`，前端不再展示购买入口
2. 前端隐藏财务中心、配置管理菜单
3. 已产生的订单和流水利保留，不做物理删除

## 14. 实施顺序

1. 编写 `schema-commercial.sql`，初始化商业化表结构 + 菜单权限种子数据
2. 实现 common 层：Entity → Enum → Mapper → DAO → DAOImpl
3. 实现 `CoinLogService`（供 PRD-07 调用的统一入口）
4. 实现 miniapp 层：VipService → CoinService → PaymentService（含模拟支付）→ AssetService（含解锁）
5. 实现 miniapp Controller 层
6. 实现 admin 层：VipPackageAdminService → CoinPackageAdminService → FinanceAdminService
7. 实现 admin Controller 层
8. 实现前端：API 模块 → 路由 → 页面组件
9. 编写测试：L1 cURL → L3 JUnit → L2 MockMvc → L4 Playwright（前端页面完成后）

## 15. 自检清单

- 未引入微服务、MQ、真实支付、退款审批流等超出本期范围的基础设施
- 后端遵守 `Controller → Service → ServiceImpl → DAO → DAOImpl → Mapper` 六层架构
- `admin/` 与 `miniapp/` 没有互相 import
- 接口统一返回 `R<T>`，后台接口带 `@RequirePermission`
- 所有实体继承 `BaseEntity`，表使用逻辑删除 `deleted TINYINT DEFAULT 0`
- 支付处理、扣币写流水在同一事务内
- 模拟支付接口幂等
- CoinLogService 作为统一入账入口，PRD-07 不直接写 `app_user_coin_log`
- 前端页面只调用 `frontend/src/api/` 模块，不直接 axios
- 测试覆盖：支付、解锁、余额不足、幂等、权限、批量限制
