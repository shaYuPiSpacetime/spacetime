-- =====================================================
-- 关系反馈后台列表修复
-- 1. app_user_unlock_record 补齐关系单条解锁字段，避免喜欢/访客/解锁列表查询异常。
-- 2. app_relation_match_source 兜底创建，避免相互喜欢列表读取来源异常。
-- 本脚本幂等，可在测试库重复执行。
-- =====================================================

SET @schema_name = DATABASE();

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'app_user_unlock_record' AND COLUMN_NAME = 'unlock_no') = 0,
              'ALTER TABLE app_user_unlock_record ADD COLUMN unlock_no VARCHAR(64) DEFAULT NULL COMMENT ''解锁业务编号，前缀 ULK-'' AFTER id',
              'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'app_user_unlock_record' AND COLUMN_NAME = 'quote_token') = 0,
              'ALTER TABLE app_user_unlock_record ADD COLUMN quote_token VARCHAR(64) DEFAULT NULL COMMENT ''解锁报价令牌'' AFTER request_id',
              'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'app_user_unlock_record' AND COLUMN_NAME = 'target_biz_type') = 0,
              'ALTER TABLE app_user_unlock_record ADD COLUMN target_biz_type VARCHAR(32) DEFAULT NULL COMMENT ''目标业务类型：like/visit'' AFTER target_user_id',
              'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'app_user_unlock_record' AND COLUMN_NAME = 'target_biz_no') = 0,
              'ALTER TABLE app_user_unlock_record ADD COLUMN target_biz_no VARCHAR(64) DEFAULT NULL COMMENT ''具体关系业务编号：LIK-*/VIS-*'' AFTER target_biz_type',
              'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'app_user_unlock_record' AND COLUMN_NAME = 'refund_no') = 0,
              'ALTER TABLE app_user_unlock_record ADD COLUMN refund_no VARCHAR(64) DEFAULT NULL COMMENT ''特批退款业务编号'' AFTER target_biz_no',
              'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'app_user_unlock_record' AND COLUMN_NAME = 'active_marker') = 0,
              'ALTER TABLE app_user_unlock_record ADD COLUMN active_marker TINYINT DEFAULT 1 COMMENT ''有效唯一标记：1-有效，NULL-已结束'' AFTER refund_no',
              'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
               WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'app_user_unlock_record' AND INDEX_NAME = 'uk_unlock_no') = 0,
              'ALTER TABLE app_user_unlock_record ADD UNIQUE KEY uk_unlock_no (unlock_no)',
              'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
               WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'app_user_unlock_record' AND INDEX_NAME = 'uk_unlock_active_target') = 0,
              'ALTER TABLE app_user_unlock_record ADD UNIQUE KEY uk_unlock_active_target (user_id, unlock_scene, target_biz_type, target_biz_no, active_marker)',
              'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
               WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'app_user_unlock_record' AND INDEX_NAME = 'idx_unlock_target_biz') = 0,
              'ALTER TABLE app_user_unlock_record ADD INDEX idx_unlock_target_biz (target_biz_type, target_biz_no, status)',
              'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
               WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'app_user_unlock_record' AND INDEX_NAME = 'idx_unlock_user_biz_status') = 0,
              'ALTER TABLE app_user_unlock_record ADD INDEX idx_unlock_user_biz_status (user_id, target_biz_type, status, active_marker, target_biz_no, effective_time)',
              'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS app_relation_match_source (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    source_no VARCHAR(64) NOT NULL COMMENT '匹配来源明细业务编号，前缀 MTS-',
    match_id BIGINT NOT NULL COMMENT '所属匹配生命周期ID',
    source_type VARCHAR(40) NOT NULL COMMENT '匹配来源',
    source_event_no VARCHAR(128) NOT NULL COMMENT '上游来源事件唯一编号',
    source_status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '来源状态：active/revoked/invalid',
    effective_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '来源生效时间',
    revoked_time DATETIME DEFAULT NULL COMMENT '来源撤销时间',
    invalid_reason VARCHAR(32) DEFAULT NULL COMMENT '撤销或失效原因',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by BIGINT DEFAULT NULL COMMENT '创建人ID',
    updated_by BIGINT DEFAULT NULL COMMENT '更新人ID',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标记：0-未删除，1-已删除',
    PRIMARY KEY (id),
    UNIQUE KEY uk_match_source_no (source_no),
    UNIQUE KEY uk_match_source_event (source_type, source_event_no),
    KEY idx_match_source_status (match_id, source_status, effective_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='匹配生命周期来源明细表';
