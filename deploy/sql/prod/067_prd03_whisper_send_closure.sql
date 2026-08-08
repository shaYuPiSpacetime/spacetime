-- =============================================================
-- PRD-03 悄悄话真实发送与扣币闭环
-- 说明：新增悄悄话业务记录；发送方 + 幂等键唯一，防止重复扣权益。
-- =============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `app_whisper` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `whisper_no` VARCHAR(64) NOT NULL COMMENT '悄悄话业务编号',
    `sender_user_id` BIGINT NOT NULL COMMENT '发送方用户ID',
    `receiver_user_id` BIGINT NOT NULL COMMENT '接收方用户ID',
    `source_post_no` VARCHAR(64) NOT NULL COMMENT '来源动态业务编号',
    `scene` VARCHAR(50) NOT NULL COMMENT '发送入口场景',
    `content` VARCHAR(255) NOT NULL COMMENT '悄悄话正文，最多60字',
    `coin_cost` INT NOT NULL DEFAULT 0 COMMENT '本次实际扣除千寻币数量',
    `payment_method` VARCHAR(20) NOT NULL COMMENT '支付方式：coin/free_quota',
    `idempotency_key` VARCHAR(128) NOT NULL COMMENT '发送方作用域内客户端幂等键',
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态：pending',
    `expire_time` DATETIME NULL COMMENT '记录失效时间，空表示永久',
    `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `created_by` BIGINT NULL COMMENT '创建人ID',
    `updated_by` BIGINT NULL COMMENT '更新人ID',
    `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_whisper_no` (`whisper_no`),
    UNIQUE KEY `uk_whisper_sender_idempotency` (`sender_user_id`, `idempotency_key`),
    KEY `idx_whisper_receiver_status_time` (`receiver_user_id`, `status`, `create_time`),
    KEY `idx_whisper_source_post` (`source_post_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='悄悄话发送记录';
