-- ======================================================
-- PRD-01 删除 app_user 审核内容快照字段
-- 头像、相册、背景图和开放文字统一从 app_user_audit_record 实时派生。
-- 本脚本可重复执行，仅删除仍然存在的字段。
-- ======================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS spacetime_drop_column_if_exists $$
CREATE PROCEDURE spacetime_drop_column_if_exists(
    IN p_table_name VARCHAR(64),
    IN p_column_name VARCHAR(64)
)
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table_name
          AND COLUMN_NAME = p_column_name
    ) THEN
        SET @sql_text = CONCAT('ALTER TABLE `', p_table_name, '` DROP COLUMN `', p_column_name, '`');
        PREPARE stmt FROM @sql_text;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

DROP PROCEDURE IF EXISTS spacetime_drop_index_if_exists $$
CREATE PROCEDURE spacetime_drop_index_if_exists(
    IN p_table_name VARCHAR(64),
    IN p_index_name VARCHAR(64)
)
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table_name
          AND INDEX_NAME = p_index_name
    ) THEN
        SET @sql_text = CONCAT('ALTER TABLE `', p_table_name, '` DROP INDEX `', p_index_name, '`');
        PREPARE stmt FROM @sql_text;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

DELIMITER ;

CALL spacetime_drop_index_if_exists('app_user', 'idx_app_user_profile_score');
CALL spacetime_drop_index_if_exists('app_user', 'idx_profile_score');
CALL spacetime_drop_column_if_exists('app_user', 'avatar');
CALL spacetime_drop_column_if_exists('app_user', 'photos');
CALL spacetime_drop_column_if_exists('app_user', 'profile_bg_image');
CALL spacetime_drop_column_if_exists('app_user', 'about_me');
CALL spacetime_drop_column_if_exists('app_user', 'hope_they_know');
CALL spacetime_drop_column_if_exists('app_user', 'profile_score');

DROP PROCEDURE IF EXISTS spacetime_drop_index_if_exists;
DROP PROCEDURE IF EXISTS spacetime_drop_column_if_exists;
