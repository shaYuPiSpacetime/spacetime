-- PRD-01：认证资料接入微信文本、图片、语音内容安全。
-- 保存微信 media_check_async 返回的 trace_id，供统一回调入口定位审核任务。

DROP PROCEDURE IF EXISTS prd01_add_external_provider_task_id;

DELIMITER $$

CREATE PROCEDURE prd01_add_external_provider_task_id()
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'external_provider_task'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'external_provider_task'
           AND COLUMN_NAME = 'external_task_id'
    ) THEN
        ALTER TABLE `external_provider_task`
            ADD COLUMN `external_task_id` VARCHAR(128) DEFAULT NULL
                COMMENT '三方异步任务编号，如微信内容安全 trace_id'
                AFTER `provider_code`;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'external_provider_task'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'external_provider_task'
           AND INDEX_NAME = 'idx_provider_task_external'
    ) THEN
        ALTER TABLE `external_provider_task`
            ADD INDEX `idx_provider_task_external` (`provider_code`, `external_task_id`, `deleted`);
    END IF;
END $$

DELIMITER ;

CALL prd01_add_external_provider_task_id();

DROP PROCEDURE IF EXISTS prd01_add_external_provider_task_id;
