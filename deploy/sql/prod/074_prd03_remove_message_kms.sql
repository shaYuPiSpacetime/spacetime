-- PRD-03：移除应用层 KMS 依赖。
-- 新消息事件使用有界明文 JSON，举报冻结证据使用受权限和审计保护的明文正文。
-- 旧密文字段暂时保留，避免破坏性升级；应用代码不再读写这些字段。

DROP PROCEDURE IF EXISTS prd03_remove_kms_add_column_if_missing;
DROP PROCEDURE IF EXISTS prd03_remove_kms_modify_column_if_exists;
DROP PROCEDURE IF EXISTS prd03_remove_kms_retire_legacy_inbox;

DELIMITER $$

CREATE PROCEDURE prd03_remove_kms_add_column_if_missing(
    IN p_table_name VARCHAR(64),
    IN p_column_name VARCHAR(64),
    IN p_column_definition TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = p_table_name
           AND COLUMN_NAME = p_column_name
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN `',
                          p_column_name, '` ', p_column_definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

CREATE PROCEDURE prd03_remove_kms_modify_column_if_exists(
    IN p_table_name VARCHAR(64),
    IN p_column_name VARCHAR(64),
    IN p_column_definition TEXT
)
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = p_table_name
           AND COLUMN_NAME = p_column_name
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table_name, '` MODIFY COLUMN `',
                          p_column_name, '` ', p_column_definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

CREATE PROCEDURE prd03_remove_kms_retire_legacy_inbox()
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'app_message_event_inbox'
           AND COLUMN_NAME = 'payload_ciphertext'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'app_message_event_inbox'
           AND COLUMN_NAME = 'payload_json'
    ) THEN
        SET @dml = 'UPDATE `app_message_event_inbox`
                       SET `status` = ''dead'',
                           `last_error_code` = ''legacy_kms_payload_unsupported'',
                           `last_error_summary` = ''历史KMS载荷无法继续处理，请由上游按原业务事件重新投递'',
                           `next_retry_time` = NULL,
                           `payload_ciphertext` = NULL,
                           `payload_iv` = NULL,
                           `payload_key_version` = NULL,
                           `payload_hmac` = NULL,
                           `payload_cleared_at` = COALESCE(`payload_cleared_at`, CURRENT_TIMESTAMP),
                           `update_time` = CURRENT_TIMESTAMP
                     WHERE `deleted` = 0
                       AND `status` IN (''pending'', ''processing'', ''failed'')
                       AND `payload_json` IS NULL
                       AND `payload_ciphertext` IS NOT NULL';
        PREPARE stmt FROM @dml;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

DELIMITER ;

CALL prd03_remove_kms_add_column_if_missing(
    'app_message_event_inbox', 'payload_json',
    'MEDIUMTEXT NULL COMMENT ''处理前有界临时业务载荷JSON，不得包含聊天正文，处理结束后清空'' AFTER `receiver_user_id`');
CALL prd03_remove_kms_add_column_if_missing(
    'app_system_message', 'title_text',
    'VARCHAR(200) NULL COMMENT ''系统消息标题明文'' AFTER `template_version`');
CALL prd03_remove_kms_add_column_if_missing(
    'app_system_message', 'content_text',
    'TEXT NULL COMMENT ''系统消息正文原始明文'' AFTER `title_text`');
CALL prd03_remove_kms_add_column_if_missing(
    'app_assistant_message', 'title_text',
    'VARCHAR(200) NULL COMMENT ''官方助手标题明文'' AFTER `template_version`');
CALL prd03_remove_kms_add_column_if_missing(
    'app_assistant_message', 'content_text',
    'TEXT NULL COMMENT ''官方助手正文原始明文'' AFTER `title_text`');
CALL prd03_remove_kms_add_column_if_missing(
    'community_report_evidence', 'content_text',
    'MEDIUMTEXT NULL COMMENT ''举报冻结时保存的受控明文正文'' AFTER `message_type`');

-- 旧版本证据密文字段原为 NOT NULL；改为可空后，新代码才能只写 content_text。
CALL prd03_remove_kms_modify_column_if_exists(
    'community_report_evidence', 'content_ciphertext',
    'MEDIUMBLOB NULL COMMENT ''历史冻结正文密文，已停用''');
CALL prd03_remove_kms_modify_column_if_exists(
    'community_report_evidence', 'content_iv',
    'VARBINARY(12) NULL COMMENT ''历史冻结证据初始向量，已停用''');
CALL prd03_remove_kms_modify_column_if_exists(
    'community_report_evidence', 'content_key_version',
    'VARCHAR(32) NULL COMMENT ''历史冻结证据密钥版本，已停用''');
CALL prd03_remove_kms_modify_column_if_exists(
    'community_report_evidence', 'content_hmac',
    'CHAR(64) NULL COMMENT ''历史冻结证据摘要，已停用''');

CALL prd03_remove_kms_retire_legacy_inbox();

DROP PROCEDURE IF EXISTS prd03_remove_kms_add_column_if_missing;
DROP PROCEDURE IF EXISTS prd03_remove_kms_modify_column_if_exists;
DROP PROCEDURE IF EXISTS prd03_remove_kms_retire_legacy_inbox;
