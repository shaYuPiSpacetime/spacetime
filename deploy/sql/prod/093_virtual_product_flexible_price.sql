-- 微信虚拟商品灵活改价：只补商品编号、订单快照与待发布记录，不修改任何套餐价格。
-- 可重复执行；历史固定价脚本 092 已退役，不能再由生产部署重放。

DROP PROCEDURE IF EXISTS spacetime_ensure_virtual_price_columns;
DELIMITER $$
CREATE PROCEDURE spacetime_ensure_virtual_price_columns()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'app_vip_package'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'app_coin_package'
    ) OR NOT EXISTS (
        SELECT 1 FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'app_trade_order'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'virtual product base tables do not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'app_coin_package'
           AND column_name = 'wechat_product_id'
    ) THEN
        ALTER TABLE app_coin_package
            ADD COLUMN wechat_product_id VARCHAR(64) DEFAULT NULL COMMENT '当前可支付微信虚拟商品ID';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'app_trade_order'
           AND column_name = 'wechat_product_id'
    ) THEN
        ALTER TABLE app_trade_order
            ADD COLUMN wechat_product_id VARCHAR(64) DEFAULT NULL COMMENT '下单时微信虚拟商品ID快照';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'app_trade_order'
           AND column_name = 'vip_duration_days'
    ) THEN
        ALTER TABLE app_trade_order
            ADD COLUMN vip_duration_days INT DEFAULT NULL COMMENT '下单时会员有效天数快照';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'app_trade_order'
           AND column_name = 'coin_count'
    ) THEN
        ALTER TABLE app_trade_order
            ADD COLUMN coin_count INT DEFAULT NULL COMMENT '下单时基础千寻币数量快照';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'app_trade_order'
           AND column_name = 'bonus_coin_count'
    ) THEN
        ALTER TABLE app_trade_order
            ADD COLUMN bonus_coin_count INT DEFAULT NULL COMMENT '下单时赠送千寻币数量快照';
    END IF;
END$$
DELIMITER ;

CALL spacetime_ensure_virtual_price_columns();
DROP PROCEDURE IF EXISTS spacetime_ensure_virtual_price_columns;

CREATE TABLE IF NOT EXISTS app_virtual_price_change (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    package_type VARCHAR(20) NOT NULL COMMENT '套餐类型：vip/coin',
    package_id BIGINT NOT NULL COMMENT '套餐ID',
    old_product_id VARCHAR(64) DEFAULT NULL COMMENT '当前生效的微信商品ID',
    new_product_id VARCHAR(64) NOT NULL COMMENT '本次新建的微信商品ID',
    target_price DECIMAL(10,2) NOT NULL COMMENT '待生效售价，单位元',
    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED' COMMENT 'QUEUED/UPLOADING/PUBLISHING/WAIT_EFFECTIVE/ACTIVE/FAILED/SUPERSEDED/CANCELLED',
    published_at DATETIME DEFAULT NULL COMMENT '微信确认发布时间',
    active_at DATETIME DEFAULT NULL COMMENT '套餐价格生效时间',
    enable_after_publish TINYINT(1) NOT NULL DEFAULT 0 COMMENT '新建停用套餐首次发布后自动上架',
    last_error VARCHAR(500) DEFAULT NULL COMMENT '最近一次失败原因摘要',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_virtual_price_new_product (new_product_id),
    INDEX idx_virtual_price_package_time (package_type, package_id, create_time),
    INDEX idx_virtual_price_status_time (status, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='微信虚拟商品待发布价格变更';

-- 仅回填已知且已有微信商品的六个存量套餐；保留后台已配置的非空商品ID。
UPDATE app_vip_package
   SET wechat_product_id = CONCAT('vip_', id),
       update_time = CURRENT_TIMESTAMP
 WHERE id IN (7, 8, 10)
   AND deleted = 0
   AND (wechat_product_id IS NULL OR TRIM(wechat_product_id) = '');

UPDATE app_coin_package
   SET wechat_product_id = CONCAT('coin_', id),
       update_time = CURRENT_TIMESTAMP
 WHERE id IN (10, 11, 12)
   AND deleted = 0
   AND (wechat_product_id IS NULL OR TRIM(wechat_product_id) = '');
