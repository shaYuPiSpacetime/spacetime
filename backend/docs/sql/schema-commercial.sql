-- ======================================================
-- 商业化模块 DDL
-- 包含：VIP权益、VIP套餐、千寻币套餐、用户资产、交易订单、千寻币流水、解锁记录
-- ======================================================

CREATE TABLE IF NOT EXISTS app_vip_benefit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    benefit_code VARCHAR(50) NOT NULL COMMENT '权益编码',
    benefit_name VARCHAR(100) DEFAULT NULL COMMENT '权益名称',
    benefit_type VARCHAR(30) DEFAULT NULL COMMENT '权益类型',
    benefit_desc VARCHAR(500) DEFAULT NULL COMMENT '权益描述',
    mobile_icon VARCHAR(100) DEFAULT NULL COMMENT '移动端图标',
    benefit_value INT DEFAULT NULL COMMENT '权益数值',
    fixed_flag TINYINT DEFAULT 0 COMMENT '是否固定权益: 0=否, 1=是',
    display_order INT DEFAULT 0 COMMENT '展示排序',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态: ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_benefit_code (benefit_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='VIP权益配置表';

CREATE TABLE IF NOT EXISTS app_vip_package (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    package_name VARCHAR(100) NOT NULL COMMENT '套餐名称',
    package_type VARCHAR(30) DEFAULT 'normal' COMMENT '套餐类型，固定 normal（普通套餐）',
    subscription_type VARCHAR(30) DEFAULT 'once' COMMENT '购买方式，固定 once（一次性购买）',
    price DECIMAL(10,2) DEFAULT 0 COMMENT '售价',
    origin_price DECIMAL(10,2) DEFAULT 0 COMMENT '原价',
    duration_days INT DEFAULT 0 COMMENT '有效天数',
    recommend_flag TINYINT DEFAULT 0 COMMENT '是否推荐: 0=否, 1=是',
    package_tag VARCHAR(50) DEFAULT NULL COMMENT '套餐标签',
    wechat_product_id VARCHAR(100) DEFAULT NULL COMMENT '微信商品ID预留',
    agreement_config VARCHAR(500) DEFAULT NULL COMMENT '协议配置',
    pay_channel_reserve VARCHAR(500) DEFAULT NULL COMMENT '支付渠道预留字段',
    sort_order INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态: ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='VIP套餐配置表';

CREATE TABLE IF NOT EXISTS app_coin_package (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    package_name VARCHAR(100) NOT NULL COMMENT '套餐名称',
    amount DECIMAL(10,2) DEFAULT 0 COMMENT '售价',
    origin_amount DECIMAL(10,2) DEFAULT 0 COMMENT '原价',
    discount_amount DECIMAL(10,2) DEFAULT NULL COMMENT '优惠价',
    coin_count INT DEFAULT 0 COMMENT '千寻币数量',
    bonus_coin_count INT DEFAULT 0 COMMENT '赠送千寻币数量',
    recommend_flag TINYINT DEFAULT 0 COMMENT '是否推荐: 0=否, 1=是',
    package_tag VARCHAR(50) DEFAULT NULL COMMENT '套餐标签',
    mobile_tag VARCHAR(50) DEFAULT NULL COMMENT '移动端展示标签',
    package_desc VARCHAR(500) DEFAULT NULL COMMENT '套餐描述',
    sort_order INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态: ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='千寻币套餐配置表';

CREATE TABLE IF NOT EXISTS app_user_asset (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    vip_status VARCHAR(20) DEFAULT 'inactive' COMMENT 'VIP状态: inactive/active/expired',
    vip_expire_time DATETIME DEFAULT NULL COMMENT 'VIP到期时间',
    coin_balance INT DEFAULT 0 COMMENT '千寻币余额',
    today_free_whisper_remain INT DEFAULT 0 COMMENT '今日剩余免费悄悄话次数',
    total_recharge DECIMAL(10,2) DEFAULT 0 COMMENT '累计充值金额',
    last_consume_time DATETIME DEFAULT NULL COMMENT '最后消费时间',
    last_purchase_time DATETIME DEFAULT NULL COMMENT '最后购买时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户资产表';

CREATE TABLE IF NOT EXISTS app_trade_order (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(64) NOT NULL COMMENT '订单编号',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    order_type VARCHAR(20) DEFAULT NULL COMMENT '订单类型: vip/coin',
    package_id BIGINT DEFAULT NULL COMMENT '套餐ID',
    package_name VARCHAR(100) DEFAULT NULL COMMENT '套餐名称',
    pay_amount DECIMAL(10,2) DEFAULT 0 COMMENT '实付金额',
    pay_channel VARCHAR(30) DEFAULT 'wechat' COMMENT '支付渠道: wechat/alipay',
    channel_trade_no VARCHAR(100) DEFAULT NULL COMMENT '渠道交易单号',
    prepay_id VARCHAR(100) DEFAULT NULL COMMENT '微信预支付交易会话标识',
    notify_summary VARCHAR(1000) DEFAULT NULL COMMENT '支付回调原始摘要',
    order_status VARCHAR(20) DEFAULT 'unpaid' COMMENT '订单状态: unpaid/success/closed/failed/refunding/refunded',
    success_time DATETIME DEFAULT NULL COMMENT '支付成功时间',
    expire_time DATETIME DEFAULT NULL COMMENT '订单过期时间',
    refund_time DATETIME DEFAULT NULL COMMENT '退款时间',
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

CREATE TABLE IF NOT EXISTS app_user_coin_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    flow_no VARCHAR(64) NOT NULL COMMENT '流水号',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    flow_type VARCHAR(20) DEFAULT NULL COMMENT '流水类型: recharge/consume/gift/refund',
    change_amount INT DEFAULT 0 COMMENT '变动数量',
    balance_before INT DEFAULT 0 COMMENT '变动前余额',
    balance_after INT DEFAULT 0 COMMENT '变动后余额',
    biz_scene VARCHAR(50) DEFAULT NULL COMMENT '业务场景',
    biz_desc VARCHAR(200) DEFAULT NULL COMMENT '业务描述',
    ref_id BIGINT DEFAULT NULL COMMENT '关联业务ID',
    ref_type VARCHAR(50) DEFAULT NULL COMMENT '关联业务类型',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_flow_no (flow_no),
    INDEX idx_user_time (user_id, create_time),
    INDEX idx_ref (ref_id, ref_type),
    INDEX idx_scene_time (biz_scene, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='千寻币流水表';

CREATE TABLE IF NOT EXISTS app_coin_scene_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    scene_code VARCHAR(50) NOT NULL COMMENT '场景编码',
    mobile_name VARCHAR(100) NOT NULL COMMENT '移动端名称',
    mobile_icon VARCHAR(100) DEFAULT NULL COMMENT '移动端图标',
    scene_desc VARCHAR(500) DEFAULT NULL COMMENT '场景说明',
    unit_price INT DEFAULT 0 COMMENT '单价，单位：千寻币',
    retention_days INT DEFAULT 0 COMMENT '保留期天数，0表示永久',
    sort_order INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态: ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_scene_code (scene_code),
    INDEX idx_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='千寻币消费场景配置表';

CREATE TABLE IF NOT EXISTS app_commercial_config_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_version VARCHAR(50) NOT NULL COMMENT '配置版本号',
    change_module VARCHAR(50) DEFAULT 'commercial' COMMENT '变更模块',
    change_summary VARCHAR(500) DEFAULT NULL COMMENT '变更摘要',
    operator_id BIGINT DEFAULT NULL COMMENT '操作人ID',
    operator_name VARCHAR(100) DEFAULT NULL COMMENT '操作人名称',
    before_snapshot JSON DEFAULT NULL COMMENT '变更前快照',
    after_snapshot JSON DEFAULT NULL COMMENT '变更后快照',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_version_time (config_version, create_time),
    INDEX idx_module_time (change_module, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商业化配置变更审计表';

CREATE TABLE IF NOT EXISTS app_refund_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    refund_no VARCHAR(64) NOT NULL COMMENT '退款单号',
    order_id BIGINT NOT NULL COMMENT '订单ID',
    order_no VARCHAR(64) NOT NULL COMMENT '订单编号',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    refund_amount DECIMAL(10,2) DEFAULT 0 COMMENT '退款金额',
    refund_reason VARCHAR(500) DEFAULT NULL COMMENT '退款原因',
    refund_status VARCHAR(30) DEFAULT 'processing' COMMENT '退款状态: processing/success/failed',
    operator_id BIGINT DEFAULT NULL COMMENT '发起人ID',
    operator_name VARCHAR(100) DEFAULT NULL COMMENT '发起人名称',
    asset_rollback_action VARCHAR(100) DEFAULT NULL COMMENT '资产回退动作',
    channel_refund_no VARCHAR(100) DEFAULT NULL COMMENT '渠道退款单号',
    channel_refund_status VARCHAR(50) DEFAULT NULL COMMENT '渠道退款状态',
    channel_response_summary VARCHAR(1000) DEFAULT NULL COMMENT '渠道响应摘要',
    refund_time DATETIME DEFAULT NULL COMMENT '退款完成时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_refund_no (refund_no),
    INDEX idx_order_id (order_id),
    INDEX idx_user_time (user_id, create_time),
    INDEX idx_status_time (refund_status, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退款记录表';

CREATE TABLE IF NOT EXISTS app_payment_notify_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    pay_channel VARCHAR(30) DEFAULT NULL COMMENT '支付渠道',
    order_no VARCHAR(64) DEFAULT NULL COMMENT '订单编号',
    channel_trade_no VARCHAR(100) DEFAULT NULL COMMENT '渠道交易单号',
    notify_type VARCHAR(50) DEFAULT NULL COMMENT '回调类型',
    notify_payload TEXT DEFAULT NULL COMMENT '回调原文',
    process_status VARCHAR(30) DEFAULT NULL COMMENT '处理状态: success/failed/ignored',
    process_message VARCHAR(1000) DEFAULT NULL COMMENT '处理结果摘要',
    notify_time DATETIME DEFAULT NULL COMMENT '通知时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_order_channel (order_no, pay_channel),
    INDEX idx_notify_time (notify_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付回调日志预留表';

CREATE TABLE IF NOT EXISTS app_user_unlock_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(64) DEFAULT NULL COMMENT '客户端请求幂等键',
    user_id BIGINT NOT NULL COMMENT '用户ID（发起解锁者）',
    target_user_id BIGINT NOT NULL COMMENT '被解锁目标用户ID',
    unlock_scene VARCHAR(50) DEFAULT NULL COMMENT '解锁场景',
    unlock_method VARCHAR(20) DEFAULT NULL COMMENT '解锁方式',
    coin_cost INT DEFAULT 0 COMMENT '消耗千寻币数量',
    effective_time DATETIME DEFAULT NULL COMMENT '生效时间',
    expire_time DATETIME DEFAULT NULL COMMENT '过期时间',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active/expired',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_user_scene (user_id, unlock_scene, status),
    INDEX idx_target (target_user_id),
    UNIQUE KEY uk_user_request_target (user_id, request_id, target_user_id),
    INDEX idx_expire (expire_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户解锁记录表';

-- 默认 8 个千寻币消费场景
INSERT INTO app_coin_scene_config (scene_code, mobile_name, mobile_icon, scene_desc, unit_price, retention_days, sort_order, status) VALUES
('whisper', '发送悄悄话（单次）', 'icon-whisper', '单次发送悄悄话', 12, 0, 1, 'ENABLED'),
('likes_unlock_one', '查看谁喜欢我（单次）', 'icon-heart-unlock', '查看单条喜欢我的清晰信息', 8, 0, 2, 'ENABLED'),
('viewers_unlock_one', '查看谁看过我（单次）', 'icon-eye-unlock', '查看单条访客清晰信息', 8, 0, 3, 'ENABLED'),
('ideal_user_unlock', '解锁理想型用户（单个）', 'icon-target-user', '单个理想型用户解锁', 18, 90, 4, 'ENABLED'),
('ideal_batch_unlock', '批量解锁理想型用户', 'icon-target-batch', '多个理想型用户批量解锁', 15, 90, 5, 'ENABLED'),
('compatible_person_unlock_one', '合拍的人（单个）', 'icon-compatible-person', '由测评结果推荐的人', 20, 90, 6, 'ENABLED'),
('soulmate_mizhiyin_unlock_one', '解锁知音-觅知音（单个）', 'icon-soulmate', '单个解锁知音对象', 28, 90, 7, 'ENABLED'),
('career_recommend_unlock_one', '立业-职业推荐', 'icon-career-recommend', '根据职业测评结果推荐职业，单次解锁；重新完成测评时才需再次解锁', 26, 0, 8, 'ENABLED')
ON DUPLICATE KEY UPDATE
    mobile_name = VALUES(mobile_name),
    mobile_icon = VALUES(mobile_icon),
    scene_desc = VALUES(scene_desc),
    unit_price = VALUES(unit_price),
    retention_days = VALUES(retention_days),
    sort_order = VALUES(sort_order),
    status = VALUES(status);

-- ======================================================
-- 商业化后台菜单与权限种子
-- 说明：若已初始化 RBAC，可按需执行本段。ID 使用 800 段避免与现有菜单冲突。
-- ======================================================

INSERT INTO sys_menu (id, parent_id, menu_name, menu_type, path, component, icon, perms, menu_sort, visible) VALUES
-- Demo 对齐菜单：移动端配置 / 商业化配置，财务中心 / 订单、流水、退款、对账
(800, 0, '财务中心', 'M', NULL, NULL, 'DollarSign', NULL, 80, 1),
(801, 800, '订单管理', 'C', '/finance/orders', 'finance/FinanceManagement', NULL, 'finance:order:list', 1, 0),
(802, 800, '流水管理', 'C', '/finance/flows', 'finance/FinanceManagement', NULL, 'finance:flow:list', 2, 0),
(803, 800, '退款管理', 'C', '/finance/refunds', 'finance/FinanceManagement', NULL, 'finance:refund:list', 3, 0),
(804, 803, '处理退款', 'F', NULL, NULL, NULL, 'finance:refund:process', 1, 0),
(805, 800, '财务统计', 'F', NULL, NULL, NULL, 'finance:stats:view', 4, 0),

(810, 0, '移动端配置', 'M', NULL, NULL, 'Settings', NULL, 81, 1),
(811, 810, 'VIP权益配置', 'C', '/config/vip-benefits', 'config/VipBenefitManagement', NULL, 'vip:benefit:list', 1, 0),
(812, 811, '新增权益', 'F', NULL, NULL, NULL, 'vip:benefit:add', 1, 0),
(813, 811, '编辑权益', 'F', NULL, NULL, NULL, 'vip:benefit:edit', 2, 0),
(814, 810, 'VIP套餐配置', 'C', '/config/vip-packages', 'config/VipPackageManagement', NULL, 'vip:package:list', 2, 0),
(815, 814, '新增套餐', 'F', NULL, NULL, NULL, 'vip:package:add', 1, 0),
(816, 814, '编辑套餐', 'F', NULL, NULL, NULL, 'vip:package:edit', 2, 0),
(817, 810, '千寻币套餐配置', 'C', '/config/coin-packages', 'config/CoinPackageManagement', NULL, 'coin:package:list', 3, 0),
(818, 817, '新增套餐', 'F', NULL, NULL, NULL, 'coin:package:add', 1, 0),
(819, 817, '编辑套餐', 'F', NULL, NULL, NULL, 'coin:package:edit', 2, 0),

(829, 0, '旧独立入口', 'M', NULL, NULL, 'BadgeDollarSign', NULL, 82, 0),
(821, 810, '商业化配置', 'C', '/commercial/config', 'commercial/CommercialManagement', NULL, 'commercial:config:view', 1, 1),
(822, 821, '保存商业化配置', 'F', NULL, NULL, NULL, 'commercial:config:edit', 1, 0),
(823, 800, '商业化订单', 'C', '/commercial/orders', 'commercial/CommercialManagement', NULL, 'finance:order:list', 1, 1),
(824, 800, '资产流水', 'C', '/commercial/flows', 'commercial/CommercialManagement', NULL, 'finance:flow:list', 2, 1),
(825, 800, '退款记录', 'C', '/commercial/refunds', 'commercial/CommercialManagement', NULL, 'finance:refund:list', 3, 1),
(826, 800, '轻量对账', 'C', '/commercial/reconcile', 'commercial/CommercialManagement', NULL, 'finance:stats:view', 4, 1),
(827, 821, '用户商业化详情', 'F', NULL, NULL, NULL, 'commercial:user:view', 6, 0),
(828, 823, '发起退款', 'F', NULL, NULL, NULL, 'finance:refund:process', 7, 0)
ON DUPLICATE KEY UPDATE
    menu_name = VALUES(menu_name),
    parent_id = VALUES(parent_id),
    menu_type = VALUES(menu_type),
    path = VALUES(path),
    component = VALUES(component),
    icon = VALUES(icon),
    perms = VALUES(perms),
    menu_sort = VALUES(menu_sort),
    visible = VALUES(visible);

-- 超级管理员拥有所有商业化菜单权限
INSERT INTO sys_role_menu (role_id, menu_id)
SELECT 1, id FROM sys_menu WHERE id BETWEEN 800 AND 899;
