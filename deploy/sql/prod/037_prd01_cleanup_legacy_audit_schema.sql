-- ======================================================
-- PRD-01 统一审核表上线后旧审核表/冗余字段清理
-- 说明：
-- 1. 只清理旧方案遗留，不删除 app_user_audit_record / app_user_audit_history。
-- 2. 编号放在 036 之后，避免 036 兼容脚本补旧结构后未清理。
-- 3. 可重复执行：旧表使用 IF EXISTS；旧字段/索引存在才删除。
-- ======================================================

DROP TABLE IF EXISTS app_user_verification_record;
DROP TABLE IF EXISTS app_user_voice_intro_record;
DROP TABLE IF EXISTS app_user_open_text_audit;
DROP TABLE IF EXISTS app_user_profile_media;
DROP TABLE IF EXISTS app_user_verification;

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

CALL spacetime_drop_index_if_exists('app_user', 'idx_app_user_voice_status');
CALL spacetime_drop_column_if_exists('app_user', 'voice_intro_url');
CALL spacetime_drop_column_if_exists('app_user', 'voice_intro_duration');
CALL spacetime_drop_column_if_exists('app_user', 'voice_intro_audit_status');
CALL spacetime_drop_column_if_exists('app_user', 'voice_intro_record_id');
CALL spacetime_drop_column_if_exists('app_user', 'voice_intro_reject_reason');
CALL spacetime_drop_column_if_exists('app_user', 'profile_bg_media_id');

CALL spacetime_drop_index_if_exists('app_user_audit_record', 'idx_audit_effective');
CALL spacetime_drop_index_if_exists('app_user_audit_record', 'idx_audit_object');
CALL spacetime_drop_column_if_exists('app_user_audit_record', 'object_id');
CALL spacetime_drop_column_if_exists('app_user_audit_record', 'object_key');
CALL spacetime_drop_column_if_exists('app_user_audit_record', 'current_effective');
CALL spacetime_drop_column_if_exists('app_user_audit_record', 'education_level');
CALL spacetime_drop_column_if_exists('app_user_audit_record', 'submit_payload_json');
CALL spacetime_drop_column_if_exists('app_user_audit_record', 'masked_payload_json');

DROP PROCEDURE IF EXISTS spacetime_drop_index_if_exists;
DROP PROCEDURE IF EXISTS spacetime_drop_column_if_exists;
