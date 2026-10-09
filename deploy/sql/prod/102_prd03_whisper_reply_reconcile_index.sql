-- PRD-03：补齐悄悄话回复卡单补偿扫描索引。
-- 补偿任务只扫描 pending 且已预占回复的少量记录，避免高频全表扫描。

DROP PROCEDURE IF EXISTS prd03_add_whisper_reply_reconcile_index;

DELIMITER $$

CREATE PROCEDURE prd03_add_whisper_reply_reconcile_index()
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'app_message_whisper'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'app_message_whisper'
           AND INDEX_NAME = 'idx_message_whisper_reply_reconcile'
    ) THEN
        ALTER TABLE `app_message_whisper`
            ADD INDEX `idx_message_whisper_reply_reconcile`
                (`deleted`, `status`, `reply_request_id`, `id`);
    END IF;
END $$

DELIMITER ;

CALL prd03_add_whisper_reply_reconcile_index();

DROP PROCEDURE IF EXISTS prd03_add_whisper_reply_reconcile_index;
