-- 商业化配置日志倒序分页索引。
-- 日志快照可能较大，缺少匹配索引时 MySQL 会对整行做文件排序并耗尽排序缓冲区。

DROP PROCEDURE IF EXISTS add_commercial_config_log_query_index;

DELIMITER $$

CREATE PROCEDURE add_commercial_config_log_query_index()
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'app_commercial_config_log'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'app_commercial_config_log'
           AND INDEX_NAME = 'idx_commercial_log_deleted_time_id'
    ) THEN
        ALTER TABLE `app_commercial_config_log`
            ADD INDEX `idx_commercial_log_deleted_time_id` (`deleted`, `create_time` DESC, `id` DESC);
    END IF;
END $$

DELIMITER ;

CALL add_commercial_config_log_query_index();

DROP PROCEDURE IF EXISTS add_commercial_config_log_query_index;
