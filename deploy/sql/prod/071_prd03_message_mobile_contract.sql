-- PRD-03 消息移动端契约补充：助手卡片、系统消息正文格式和行动文案快照。
-- 通过 information_schema 判断列是否存在，可安全重复执行。

DROP PROCEDURE IF EXISTS prd03_mobile_add_column_if_missing;
DROP PROCEDURE IF EXISTS prd03_mobile_add_index_if_missing;

DELIMITER $$

CREATE PROCEDURE prd03_mobile_add_column_if_missing(
    IN p_table_name VARCHAR(64),
    IN p_column_name VARCHAR(64),
    IN p_column_definition TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM information_schema.COLUMNS
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

CREATE PROCEDURE prd03_mobile_add_index_if_missing(
    IN p_table_name VARCHAR(64),
    IN p_index_name VARCHAR(64),
    IN p_index_definition TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = p_table_name
           AND INDEX_NAME = p_index_name
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table_name, '` ADD ', p_index_definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END $$

DELIMITER ;

CALL prd03_mobile_add_column_if_missing(
    'app_message_template_version', 'card_type',
    'VARCHAR(20) NOT NULL DEFAULT ''text'' COMMENT ''助手卡片类型：text-纯文本，action-行动卡片，tip-提示卡片'' AFTER `content_template`');
CALL prd03_mobile_add_column_if_missing(
    'app_message_template_version', 'content_format',
    'VARCHAR(20) NOT NULL DEFAULT ''plain_text'' COMMENT ''系统消息正文格式：plain_text-纯文本，rich_text-白名单富文本'' AFTER `card_type`');
CALL prd03_mobile_add_column_if_missing(
    'app_message_template_version', 'action_text_template',
    'VARCHAR(32) NULL COMMENT ''行动按钮文案模板，渲染后最多10个字符'' AFTER `content_format`');

CALL prd03_mobile_add_column_if_missing(
    'app_assistant_message', 'card_type',
    'VARCHAR(20) NOT NULL DEFAULT ''text'' COMMENT ''卡片类型：text-纯文本，action-行动卡片，tip-提示卡片'' AFTER `content_hmac`');
CALL prd03_mobile_add_column_if_missing(
    'app_assistant_message', 'action_text',
    'VARCHAR(32) NULL COMMENT ''行动按钮文案，渲染后最多10个字符'' AFTER `action_type`');

CALL prd03_mobile_add_column_if_missing(
    'app_system_message', 'content_format',
    'VARCHAR(20) NOT NULL DEFAULT ''plain_text'' COMMENT ''正文格式：plain_text-纯文本，rich_text-白名单富文本'' AFTER `content_hmac`');
CALL prd03_mobile_add_column_if_missing(
    'app_system_message', 'action_text',
    'VARCHAR(32) NULL COMMENT ''行动按钮文案，渲染后最多10个字符'' AFTER `jump_type`');

CALL prd03_mobile_add_column_if_missing(
    'app_message_conversation_member', 'last_read_message_time',
    'DATETIME NULL COMMENT ''已读水位覆盖的最近消息发送时间，仅允许单调递增'' AFTER `peer_user_id`');
CALL prd03_mobile_add_column_if_missing(
    'app_message_conversation_member', 'last_read_at',
    'DATETIME NULL COMMENT ''最近一次推进已读水位的业务时间，仅允许单调递增'' AFTER `last_read_message_time`');

CALL prd03_mobile_add_index_if_missing(
    'app_message_conversation', 'idx_message_conversation_pair_lifecycle',
    'INDEX `idx_message_conversation_pair_lifecycle` (`user_low_id`, `user_high_id`, `create_time`, `invalid_time`, `deleted`)');
CALL prd03_mobile_add_index_if_missing(
    'app_message_record', 'idx_message_record_tim_id',
    'INDEX `idx_message_record_tim_id` (`conversation_id`, `tim_message_id`)');

DROP PROCEDURE IF EXISTS prd03_mobile_add_column_if_missing;
DROP PROCEDURE IF EXISTS prd03_mobile_add_index_if_missing;

UPDATE `app_message_template_version`
   SET `content_format` = COALESCE(`content_format`, 'plain_text'),
       `action_text_template` = COALESCE(`action_text_template`, CASE
           WHEN `jump_type` <> 'none' THEN '查看详情'
           ELSE NULL
       END)
 WHERE `deleted` = 0;

UPDATE `app_assistant_message`
   SET `action_text` = COALESCE(`action_text`,
       CASE WHEN `action_type` <> 'none' THEN '查看详情' ELSE NULL END)
 WHERE `deleted` = 0;

UPDATE `app_system_message`
   SET `content_format` = COALESCE(`content_format`, 'plain_text'),
       `action_text` = COALESCE(`action_text`,
       CASE WHEN `jump_type` <> 'none' THEN '查看详情' ELSE NULL END)
 WHERE `deleted` = 0;
