-- ======================================================
-- 商业化旧表兼容字段安全迁移
-- 兼容已执行早期 schema-commercial.sql 的环境。
-- ======================================================

DROP PROCEDURE IF EXISTS spacetime_add_column_if_missing;

DELIMITER //

CREATE PROCEDURE spacetime_add_column_if_missing(
    IN p_table_name VARCHAR(128),
    IN p_column_name VARCHAR(128),
    IN p_column_definition TEXT
)
BEGIN
    IF (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table_name
          AND COLUMN_NAME = p_column_name
    ) = 0 THEN
        SET @ddl = CONCAT('ALTER TABLE ', p_table_name, ' ADD COLUMN ', p_column_definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//

DELIMITER ;

CALL spacetime_add_column_if_missing('app_vip_benefit', 'mobile_icon', 'mobile_icon VARCHAR(100) DEFAULT NULL COMMENT ''移动端图标''');
CALL spacetime_add_column_if_missing('app_vip_benefit', 'benefit_value', 'benefit_value INT DEFAULT NULL COMMENT ''权益数值''');
CALL spacetime_add_column_if_missing('app_vip_benefit', 'fixed_flag', 'fixed_flag TINYINT DEFAULT 0 COMMENT ''是否固定权益: 0=否, 1=是''');

CALL spacetime_add_column_if_missing('app_vip_package', 'subscription_type', 'subscription_type VARCHAR(30) DEFAULT ''once'' COMMENT ''订阅类型: once/month/quarter/year''');
CALL spacetime_add_column_if_missing('app_vip_package', 'wechat_product_id', 'wechat_product_id VARCHAR(100) DEFAULT NULL COMMENT ''微信商品ID预留''');
CALL spacetime_add_column_if_missing('app_vip_package', 'agreement_config', 'agreement_config VARCHAR(500) DEFAULT NULL COMMENT ''协议配置''');
CALL spacetime_add_column_if_missing('app_vip_package', 'pay_channel_reserve', 'pay_channel_reserve VARCHAR(500) DEFAULT NULL COMMENT ''支付渠道预留字段''');

CALL spacetime_add_column_if_missing('app_coin_package', 'origin_amount', 'origin_amount DECIMAL(10,2) DEFAULT 0 COMMENT ''原价''');
CALL spacetime_add_column_if_missing('app_coin_package', 'discount_amount', 'discount_amount DECIMAL(10,2) DEFAULT NULL COMMENT ''优惠价''');
CALL spacetime_add_column_if_missing('app_coin_package', 'mobile_tag', 'mobile_tag VARCHAR(50) DEFAULT NULL COMMENT ''移动端展示标签''');

CALL spacetime_add_column_if_missing('app_trade_order', 'pay_channel', 'pay_channel VARCHAR(30) DEFAULT ''mock'' COMMENT ''支付渠道: mock/wechat/alipay''');
CALL spacetime_add_column_if_missing('app_trade_order', 'channel_trade_no', 'channel_trade_no VARCHAR(100) DEFAULT NULL COMMENT ''渠道交易单号''');
CALL spacetime_add_column_if_missing('app_trade_order', 'prepay_id', 'prepay_id VARCHAR(100) DEFAULT NULL COMMENT ''微信预支付交易会话标识''');
CALL spacetime_add_column_if_missing('app_trade_order', 'notify_summary', 'notify_summary VARCHAR(1000) DEFAULT NULL COMMENT ''支付回调原始摘要''');

CALL spacetime_add_column_if_missing('app_user_coin_log', 'balance_before', 'balance_before INT DEFAULT 0 COMMENT ''变动前余额''');

DROP PROCEDURE IF EXISTS spacetime_add_column_if_missing;
