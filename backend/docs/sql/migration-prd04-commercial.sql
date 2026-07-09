-- ======================================================
-- PRD-04 商业化后台闭环升级迁移
-- 适用：已执行过早期 schema-commercial.sql 的环境
-- 说明：ADD COLUMN IF NOT EXISTS 需要 MySQL 8.0.29+，低版本请先人工确认字段是否存在。
-- ======================================================

ALTER TABLE app_vip_benefit
    ADD COLUMN IF NOT EXISTS mobile_icon VARCHAR(100) DEFAULT NULL COMMENT '移动端图标',
    ADD COLUMN IF NOT EXISTS benefit_value INT DEFAULT NULL COMMENT '权益数值',
    ADD COLUMN IF NOT EXISTS fixed_flag TINYINT DEFAULT 0 COMMENT '是否固定权益: 0=否, 1=是';

ALTER TABLE app_vip_package
    ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(30) DEFAULT 'once' COMMENT '订阅类型: once/month/quarter/year',
    ADD COLUMN IF NOT EXISTS wechat_product_id VARCHAR(100) DEFAULT NULL COMMENT '微信商品ID预留',
    ADD COLUMN IF NOT EXISTS agreement_config VARCHAR(500) DEFAULT NULL COMMENT '协议配置',
    ADD COLUMN IF NOT EXISTS pay_channel_reserve VARCHAR(500) DEFAULT NULL COMMENT '支付渠道预留字段';

ALTER TABLE app_coin_package
    ADD COLUMN IF NOT EXISTS origin_amount DECIMAL(10,2) DEFAULT 0 COMMENT '原价',
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT NULL COMMENT '优惠价',
    ADD COLUMN IF NOT EXISTS mobile_tag VARCHAR(50) DEFAULT NULL COMMENT '移动端展示标签';

ALTER TABLE app_trade_order
    ADD COLUMN IF NOT EXISTS pay_channel VARCHAR(30) DEFAULT 'mock' COMMENT '支付渠道: mock/wechat/alipay',
    ADD COLUMN IF NOT EXISTS channel_trade_no VARCHAR(100) DEFAULT NULL COMMENT '渠道交易单号',
    ADD COLUMN IF NOT EXISTS prepay_id VARCHAR(100) DEFAULT NULL COMMENT '微信预支付交易会话标识',
    ADD COLUMN IF NOT EXISTS notify_summary VARCHAR(1000) DEFAULT NULL COMMENT '支付回调原始摘要';

ALTER TABLE app_user_coin_log
    ADD COLUMN IF NOT EXISTS balance_before INT DEFAULT 0 COMMENT '变动前余额';

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
