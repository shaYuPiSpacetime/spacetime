-- ======================================================
-- 微信授权手机号登录字段安全迁移
-- ======================================================

DROP PROCEDURE IF EXISTS spacetime_add_column_if_missing;
DROP PROCEDURE IF EXISTS spacetime_add_index_if_missing;

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

CREATE PROCEDURE spacetime_add_index_if_missing(
    IN p_table_name VARCHAR(128),
    IN p_index_name VARCHAR(128),
    IN p_index_definition TEXT
)
BEGIN
    IF (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table_name
          AND INDEX_NAME = p_index_name
    ) = 0 THEN
        SET @ddl = CONCAT('ALTER TABLE ', p_table_name, ' ADD ', p_index_definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//

DELIMITER ;

CALL spacetime_add_column_if_missing('app_user', 'phone', 'phone VARCHAR(30) DEFAULT NULL COMMENT ''微信授权手机号'' AFTER unionid');
CALL spacetime_add_column_if_missing('app_user', 'phone_hash', 'phone_hash VARCHAR(64) DEFAULT NULL COMMENT ''手机号 SHA-256 哈希'' AFTER phone');
CALL spacetime_add_index_if_missing('app_user', 'uk_app_user_phone_hash_deleted', 'UNIQUE KEY uk_app_user_phone_hash_deleted (phone_hash, deleted)');

DROP PROCEDURE IF EXISTS spacetime_add_column_if_missing;
DROP PROCEDURE IF EXISTS spacetime_add_index_if_missing;
