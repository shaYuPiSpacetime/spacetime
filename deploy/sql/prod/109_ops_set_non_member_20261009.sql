-- 一次性生产运维：将指定 App 用户设置为非会员。
-- 仅使用手机号 SHA-256 定位账号，不在仓库或日志中保存手机号明文。
-- 只修改 app_user_asset.vip_status / vip_expire_time；其余资产与订单数据保持不变。

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ops_user_membership_change_log` (
    `operation_key` VARCHAR(96) NOT NULL,
    `user_id` BIGINT NOT NULL,
    `before_vip_status` VARCHAR(20) NULL,
    `before_vip_expire_time` DATETIME NULL,
    `after_vip_status` VARCHAR(20) NOT NULL,
    `after_vip_expire_time` DATETIME NULL,
    `rows_updated` INT NOT NULL DEFAULT 0,
    `executed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`operation_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='一次性生产会员状态变更执行记录';

CREATE TABLE IF NOT EXISTS `ops_bak_20261009_user_asset` LIKE `app_user_asset`;

DROP PROCEDURE IF EXISTS `spacetime_ops_set_non_member_20261009`;

DELIMITER $$

CREATE PROCEDURE `spacetime_ops_set_non_member_20261009`()
membership_main: BEGIN
    DECLARE v_operation_key VARCHAR(96) DEFAULT 'set_non_member_20261009_7e7cec43';
    DECLARE v_user_count INT DEFAULT 0;
    DECLARE v_user_id BIGINT DEFAULT NULL;
    DECLARE v_asset_count INT DEFAULT 0;
    DECLARE v_before_status VARCHAR(20) DEFAULT NULL;
    DECLARE v_before_expire DATETIME DEFAULT NULL;
    DECLARE v_after_status VARCHAR(20) DEFAULT NULL;
    DECLARE v_after_expire DATETIME DEFAULT NULL;
    DECLARE v_rows_updated INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF EXISTS (
        SELECT 1
          FROM ops_user_membership_change_log
         WHERE operation_key = v_operation_key
    ) THEN
        SELECT 'already_completed' AS operation_status,
               operation_key,
               user_id,
               before_vip_status,
               before_vip_expire_time,
               after_vip_status,
               after_vip_expire_time,
               rows_updated,
               executed_at
          FROM ops_user_membership_change_log
         WHERE operation_key = v_operation_key;
        LEAVE membership_main;
    END IF;

    SELECT COUNT(*), MIN(id)
      INTO v_user_count, v_user_id
      FROM app_user
     WHERE (phone_hash = '7e7cec43af79a11df99961fe293afd5ffd9443c8fd8b9b834b407077c07ea75b'
            OR SHA2(TRIM(phone), 256) = '7e7cec43af79a11df99961fe293afd5ffd9443c8fd8b9b834b407077c07ea75b')
       AND deleted = 0;

    IF v_user_count <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '目标账号未唯一命中，已停止会员状态变更';
    END IF;

    SELECT COUNT(*)
      INTO v_asset_count
      FROM app_user_asset
     WHERE user_id = v_user_id
       AND deleted = 0;

    IF v_asset_count <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '目标账号资产记录未唯一命中，已停止会员状态变更';
    END IF;

    START TRANSACTION;

    SELECT vip_status, vip_expire_time
      INTO v_before_status, v_before_expire
      FROM app_user_asset
     WHERE user_id = v_user_id
       AND deleted = 0
     FOR UPDATE;

    INSERT IGNORE INTO ops_bak_20261009_user_asset
    SELECT *
      FROM app_user_asset
     WHERE user_id = v_user_id
       AND deleted = 0;

    UPDATE app_user_asset
       SET vip_status = 'inactive',
           vip_expire_time = NULL,
           update_time = CURRENT_TIMESTAMP
     WHERE user_id = v_user_id
       AND deleted = 0;

    SET v_rows_updated = ROW_COUNT();

    SELECT vip_status, vip_expire_time
      INTO v_after_status, v_after_expire
      FROM app_user_asset
     WHERE user_id = v_user_id
       AND deleted = 0;

    IF NOT (v_after_status <=> 'inactive') OR v_after_expire IS NOT NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '会员状态回查未达到非会员条件，事务已回滚';
    END IF;

    INSERT INTO ops_user_membership_change_log (
        operation_key,
        user_id,
        before_vip_status,
        before_vip_expire_time,
        after_vip_status,
        after_vip_expire_time,
        rows_updated,
        executed_at
    ) VALUES (
        v_operation_key,
        v_user_id,
        v_before_status,
        v_before_expire,
        v_after_status,
        v_after_expire,
        v_rows_updated,
        CURRENT_TIMESTAMP
    );

    COMMIT;

    SELECT 'completed' AS operation_status,
           v_user_id AS user_id,
           v_before_status AS before_vip_status,
           v_before_expire AS before_vip_expire_time,
           v_after_status AS after_vip_status,
           v_after_expire AS after_vip_expire_time,
           v_rows_updated AS rows_updated;
END$$

DELIMITER ;

CALL `spacetime_ops_set_non_member_20261009`();

DROP PROCEDURE IF EXISTS `spacetime_ops_set_non_member_20261009`;
