-- ======================================================
-- 商业化模块 DDL
-- 包含：VIP权益、VIP套餐、成家币套餐、用户资产、交易订单、成家币流水、解锁记录
-- ======================================================

CREATE TABLE IF NOT EXISTS app_vip_benefit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    benefit_code VARCHAR(50) NOT NULL COMMENT '权益编码',
    benefit_name VARCHAR(100) DEFAULT NULL COMMENT '权益名称',
    benefit_type VARCHAR(30) DEFAULT NULL COMMENT '权益类型',
    benefit_desc VARCHAR(500) DEFAULT NULL COMMENT '权益描述',
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
    package_type VARCHAR(30) DEFAULT 'normal' COMMENT '套餐类型: normal/limited',
    price DECIMAL(10,2) DEFAULT 0 COMMENT '售价',
    origin_price DECIMAL(10,2) DEFAULT 0 COMMENT '原价',
    duration_days INT DEFAULT 0 COMMENT '有效天数',
    recommend_flag TINYINT DEFAULT 0 COMMENT '是否推荐: 0=否, 1=是',
    package_tag VARCHAR(50) DEFAULT NULL COMMENT '套餐标签',
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
    coin_count INT DEFAULT 0 COMMENT '成家币数量',
    bonus_coin_count INT DEFAULT 0 COMMENT '赠送成家币数量',
    recommend_flag TINYINT DEFAULT 0 COMMENT '是否推荐: 0=否, 1=是',
    package_tag VARCHAR(50) DEFAULT NULL COMMENT '套餐标签',
    package_desc VARCHAR(500) DEFAULT NULL COMMENT '套餐描述',
    sort_order INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态: ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成家币套餐配置表';

CREATE TABLE IF NOT EXISTS app_user_asset (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    vip_status VARCHAR(20) DEFAULT 'inactive' COMMENT 'VIP状态: inactive/active/expired',
    vip_expire_time DATETIME DEFAULT NULL COMMENT 'VIP到期时间',
    coin_balance INT DEFAULT 0 COMMENT '成家币余额',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成家币流水表';

CREATE TABLE IF NOT EXISTS app_user_unlock_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID（发起解锁者）',
    target_user_id BIGINT NOT NULL COMMENT '被解锁目标用户ID',
    unlock_scene VARCHAR(50) DEFAULT NULL COMMENT '解锁场景',
    unlock_method VARCHAR(20) DEFAULT NULL COMMENT '解锁方式',
    coin_cost INT DEFAULT 0 COMMENT '消耗成家币数量',
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
    INDEX idx_expire (expire_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户解锁记录表';

-- ======================================================
-- 商业化后台菜单与权限种子
-- 说明：若已初始化 RBAC，可按需执行本段。ID 使用 800 段避免与现有菜单冲突。
-- ======================================================

INSERT INTO sys_menu (id, parent_id, menu_name, menu_type, path, component, icon, perms, menu_sort, visible) VALUES
-- 财务中心
(800, 0, '财务中心', 'M', NULL, NULL, 'DollarSign', NULL, 80, 1),
(801, 800, '订单管理', 'C', '/finance/orders', 'finance/FinanceManagement', NULL, 'finance:order:list', 1, 1),
(802, 800, '流水管理', 'C', '/finance/flows', 'finance/FinanceManagement', NULL, 'finance:flow:list', 2, 1),
(803, 800, '退款管理', 'C', '/finance/refunds', 'finance/FinanceManagement', NULL, 'finance:refund:list', 3, 1),
(804, 803, '处理退款', 'F', NULL, NULL, NULL, 'finance:refund:process', 1, 0),
(805, 800, '财务统计', 'F', NULL, NULL, NULL, 'finance:stats:view', 4, 0),

-- 移动端配置管理
(810, 0, '移动端配置管理', 'M', NULL, NULL, 'Settings', NULL, 81, 1),
(811, 810, 'VIP权益配置', 'C', '/config/vip-benefits', 'config/VipBenefitManagement', NULL, 'vip:benefit:list', 1, 1),
(812, 811, '新增权益', 'F', NULL, NULL, NULL, 'vip:benefit:add', 1, 0),
(813, 811, '编辑权益', 'F', NULL, NULL, NULL, 'vip:benefit:edit', 2, 0),
(814, 810, 'VIP套餐配置', 'C', '/config/vip-packages', 'config/VipPackageManagement', NULL, 'vip:package:list', 2, 1),
(815, 814, '新增套餐', 'F', NULL, NULL, NULL, 'vip:package:add', 1, 0),
(816, 814, '编辑套餐', 'F', NULL, NULL, NULL, 'vip:package:edit', 2, 0),
(817, 810, '成家币套餐配置', 'C', '/config/coin-packages', 'config/CoinPackageManagement', NULL, 'coin:package:list', 3, 1),
(818, 817, '新增套餐', 'F', NULL, NULL, NULL, 'coin:package:add', 1, 0),
(819, 817, '编辑套餐', 'F', NULL, NULL, NULL, 'coin:package:edit', 2, 0)
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
