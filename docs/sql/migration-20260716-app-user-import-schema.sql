-- PRD01 App 用户导入/导出：补齐导入预校验批次表与行表。
-- 可重复执行；用于修复测试库缺表，以及旧 schema 中 app_user_import_row.fail_reason 与实体字段 error_msg 不一致的问题。

CREATE TABLE IF NOT EXISTS app_user_import_batch (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_no VARCHAR(64) NOT NULL COMMENT '导入批次号',
    file_name VARCHAR(200) DEFAULT NULL COMMENT '原始文件名',
    total_count INT NOT NULL DEFAULT 0 COMMENT '总行数',
    success_count INT NOT NULL DEFAULT 0 COMMENT '成功行数',
    fail_count INT NOT NULL DEFAULT 0 COMMENT '失败行数',
    status VARCHAR(30) NOT NULL DEFAULT 'PRECHECKED' COMMENT '批次状态',
    operator_id BIGINT DEFAULT NULL COMMENT '操作管理员ID',
    result_url VARCHAR(500) DEFAULT NULL COMMENT '结果文件URL',
    error_summary_json JSON DEFAULT NULL COMMENT '错误摘要JSON',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_app_user_import_batch_no (batch_no),
    KEY idx_app_user_import_batch_status (status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='App用户导入批次表';

CREATE TABLE IF NOT EXISTS app_user_import_row (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_id BIGINT NOT NULL COMMENT '批次ID',
    row_no INT NOT NULL COMMENT 'Excel/CSV行号',
    raw_json JSON DEFAULT NULL COMMENT '原始行JSON',
    status VARCHAR(30) NOT NULL COMMENT '行状态',
    error_msg VARCHAR(500) DEFAULT NULL COMMENT '错误信息',
    user_id BIGINT DEFAULT NULL COMMENT '入库后的用户ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    KEY idx_app_user_import_row_batch (batch_id, row_no),
    KEY idx_app_user_import_row_status (batch_id, status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='App用户导入行预校验结果表';

SET @has_result_url := (
    SELECT COUNT(1)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'app_user_import_batch'
      AND column_name = 'result_url'
);
SET @sql := IF(@has_result_url = 0,
    'ALTER TABLE app_user_import_batch ADD COLUMN result_url VARCHAR(500) DEFAULT NULL COMMENT ''结果文件URL'' AFTER operator_id',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_error_msg := (
    SELECT COUNT(1)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'app_user_import_row'
      AND column_name = 'error_msg'
);
SET @has_fail_reason := (
    SELECT COUNT(1)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'app_user_import_row'
      AND column_name = 'fail_reason'
);
SET @sql := IF(@has_error_msg = 0 AND @has_fail_reason > 0,
    'ALTER TABLE app_user_import_row CHANGE COLUMN fail_reason error_msg VARCHAR(500) DEFAULT NULL COMMENT ''错误信息''',
    IF(@has_error_msg = 0,
        'ALTER TABLE app_user_import_row ADD COLUMN error_msg VARCHAR(500) DEFAULT NULL COMMENT ''错误信息'' AFTER status',
        'SELECT 1'
    )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
