-- PRD-03：系统消息、官方助手标题正文改为非高敏明文存储。
-- 新增列保持可空，以兼容升级前仅有密文的历史消息。

DROP PROCEDURE IF EXISTS prd03_plaintext_add_column_if_missing;

DELIMITER $$

CREATE PROCEDURE prd03_plaintext_add_column_if_missing(
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

DELIMITER ;

CALL prd03_plaintext_add_column_if_missing(
    'app_system_message', 'title_text',
    'VARCHAR(200) NULL COMMENT ''系统消息标题明文'' AFTER `template_version`');
CALL prd03_plaintext_add_column_if_missing(
    'app_system_message', 'content_text',
    'TEXT NULL COMMENT ''系统消息正文原始明文'' AFTER `title_text`');
CALL prd03_plaintext_add_column_if_missing(
    'app_assistant_message', 'title_text',
    'VARCHAR(200) NULL COMMENT ''官方助手标题明文'' AFTER `template_version`');
CALL prd03_plaintext_add_column_if_missing(
    'app_assistant_message', 'content_text',
    'TEXT NULL COMMENT ''官方助手正文原始明文'' AFTER `title_text`');

DROP PROCEDURE IF EXISTS prd03_plaintext_add_column_if_missing;
