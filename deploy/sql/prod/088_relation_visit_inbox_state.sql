-- 最近访客未读角标持久化。
-- 记录每个用户已经确认渲染到的访问事件快照，支持跨设备清零和新访问重新计数。

CREATE TABLE IF NOT EXISTS `app_relation_visit_inbox_state` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '被访问用户ID，每个用户唯一一条读取状态',
    `last_read_visit_time` DATETIME DEFAULT NULL COMMENT '已确认查看到的访问事件时间',
    `last_read_visit_event_id` BIGINT DEFAULT NULL COMMENT '已确认查看到的访问事件主键ID',
    `read_at` DATETIME DEFAULT NULL COMMENT '最近一次成功推进读取位置的时间',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
    `updated_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_visit_inbox_user` (`user_id`),
    CONSTRAINT `chk_visit_inbox_cursor_pair` CHECK (
        (`last_read_visit_time` IS NULL AND `last_read_visit_event_id` IS NULL)
        OR (`last_read_visit_time` IS NOT NULL AND `last_read_visit_event_id` IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='最近访客用户级已读游标表';

-- 兼容曾提前执行过旧草稿的环境：先修复半写游标，再补约束和访问事件快照索引。
UPDATE `app_relation_visit_inbox_state`
   SET `last_read_visit_time` = NULL,
       `last_read_visit_event_id` = NULL
 WHERE (`last_read_visit_time` IS NULL) <> (`last_read_visit_event_id` IS NULL);

DROP PROCEDURE IF EXISTS add_relation_visit_inbox_support;

DELIMITER $$

CREATE PROCEDURE add_relation_visit_inbox_support()
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM information_schema.TABLE_CONSTRAINTS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'app_relation_visit_inbox_state'
           AND CONSTRAINT_NAME = 'chk_visit_inbox_cursor_pair'
    ) THEN
        ALTER TABLE `app_relation_visit_inbox_state`
            ADD CONSTRAINT `chk_visit_inbox_cursor_pair` CHECK (
                (`last_read_visit_time` IS NULL AND `last_read_visit_event_id` IS NULL)
                OR (`last_read_visit_time` IS NOT NULL AND `last_read_visit_event_id` IS NOT NULL)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'app_relation_visit_event'
           AND INDEX_NAME = 'idx_visit_event_target_deleted_time_id_visitor'
    ) THEN
        ALTER TABLE `app_relation_visit_event`
            ADD INDEX `idx_visit_event_target_deleted_time_id_visitor`
                (`target_user_id`, `deleted`, `visit_time`, `id`, `visitor_user_id`, `visit_id`);
    END IF;
END $$

DELIMITER ;

CALL add_relation_visit_inbox_support();

DROP PROCEDURE IF EXISTS add_relation_visit_inbox_support;
