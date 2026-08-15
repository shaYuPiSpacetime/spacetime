-- PRD-03：补齐 TIM 消息 ID 全局定位索引。
-- 已读上报和举报上下文会仅按 tim_message_id 查询，原联合索引无法覆盖该查询前缀。

DROP PROCEDURE IF EXISTS prd03_add_tim_message_lookup_index;

DELIMITER $$

CREATE PROCEDURE prd03_add_tim_message_lookup_index()
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'app_message_record'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'app_message_record'
           AND INDEX_NAME = 'idx_message_record_tim_message_id'
    ) THEN
        ALTER TABLE `app_message_record`
            ADD INDEX `idx_message_record_tim_message_id` (`tim_message_id`);
    END IF;
END $$

DELIMITER ;

CALL prd03_add_tim_message_lookup_index();

DROP PROCEDURE IF EXISTS prd03_add_tim_message_lookup_index;
