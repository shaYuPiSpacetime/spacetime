-- PRD01 App 用户导入/导出历史：补齐导出任务表。
-- 可重复执行；用于“查看导入导出结果”分页查询历史导出记录。

CREATE TABLE IF NOT EXISTS app_user_export_task (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    task_no VARCHAR(64) NOT NULL COMMENT '导出任务编号',
    export_type VARCHAR(64) NOT NULL COMMENT '导出类型',
    status VARCHAR(30) NOT NULL DEFAULT 'CREATED' COMMENT '任务状态',
    message VARCHAR(500) DEFAULT NULL COMMENT '提示文案',
    filter_summary VARCHAR(1000) DEFAULT NULL COMMENT '筛选条件摘要',
    file_name VARCHAR(200) DEFAULT NULL COMMENT '导出文件名',
    row_count INT NOT NULL DEFAULT 0 COMMENT '导出行数',
    download_content LONGTEXT DEFAULT NULL COMMENT '导出文件内容',
    operator_id BIGINT DEFAULT NULL COMMENT '操作管理员ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_app_user_export_task_no (task_no),
    KEY idx_app_user_export_task_status (status, deleted),
    KEY idx_app_user_export_task_time (create_time, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='App用户导出任务表';
