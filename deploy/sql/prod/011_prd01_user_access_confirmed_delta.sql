-- ======================================================
-- PRD-01 用户准入与资料认证初始化确认版增量
-- 2026-07-07：表设计经用户统一确认
-- ======================================================

ALTER TABLE app_user
    ADD COLUMN phone VARCHAR(20) DEFAULT NULL COMMENT '绑定手机号明文，展示时业务脱敏',
    ADD COLUMN phone_hash CHAR(64) DEFAULT NULL COMMENT '手机号规范化后 SHA-256，用于查询去重',
    ADD COLUMN identity VARCHAR(30) DEFAULT NULL COMMENT '身份：职场人/在校生等',
    ADD COLUMN weight INT DEFAULT NULL COMMENT '体重 kg',
    ADD COLUMN occupation VARCHAR(100) DEFAULT NULL COMMENT '职业',
    ADD COLUMN annual_income VARCHAR(50) DEFAULT NULL COMMENT '年收入区间',
    ADD COLUMN children_plan VARCHAR(50) DEFAULT NULL COMMENT '生育计划',
    ADD COLUMN want_child VARCHAR(50) DEFAULT NULL COMMENT '是否想要孩子',
    ADD COLUMN hometown_district VARCHAR(50) DEFAULT NULL COMMENT '家乡区县',
    ADD COLUMN profile_bg_media_id BIGINT DEFAULT NULL COMMENT '资料背景图媒体 ID',
    ADD COLUMN voice_intro_audit_status VARCHAR(30) NOT NULL DEFAULT 'NOT_SUBMITTED' COMMENT '语音介绍审核状态',
    ADD COLUMN voice_intro_record_id BIGINT DEFAULT NULL COMMENT '当前有效或最新语音介绍记录 ID',
    ADD COLUMN voice_intro_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '最新语音介绍驳回原因',
    ADD INDEX idx_app_user_phone_hash (phone_hash),
    ADD INDEX idx_app_user_voice_status (voice_intro_audit_status, deleted);

ALTER TABLE app_user_verification
    ADD COLUMN bound_phone VARCHAR(20) DEFAULT NULL COMMENT '实名认证绑定手机号明文',
    ADD COLUMN real_name_hash CHAR(64) DEFAULT NULL COMMENT '真实姓名规范化后 SHA-256',
    ADD COLUMN id_card_hash CHAR(64) DEFAULT NULL COMMENT '身份证号规范化后 SHA-256',
    ADD COLUMN real_name_audit_source VARCHAR(20) NOT NULL DEFAULT 'MACHINE' COMMENT '实名审核来源：MACHINE/MANUAL',
    ADD COLUMN real_name_provider_task_id BIGINT DEFAULT NULL COMMENT '实名 Provider 任务 ID',
    ADD COLUMN education_audit_source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' COMMENT '学历审核来源：MACHINE/MANUAL',
    ADD COLUMN education_provider_task_id BIGINT DEFAULT NULL COMMENT '学历 Provider 任务 ID',
    ADD COLUMN avatar_audit_source VARCHAR(20) NOT NULL DEFAULT 'MACHINE' COMMENT '头像审核来源：MACHINE/MANUAL',
    ADD COLUMN avatar_provider_task_id BIGINT DEFAULT NULL COMMENT '头像 Provider 任务 ID',
    ADD COLUMN core_access_status VARCHAR(30) NOT NULL DEFAULT 'CORE_BLOCKED' COMMENT '核心准入状态',
    ADD COLUMN core_access_reason VARCHAR(200) DEFAULT NULL COMMENT '核心准入阻断原因',
    ADD INDEX idx_app_user_verification_id_card_hash (id_card_hash),
    ADD INDEX idx_app_user_verification_core_access (core_access_status, deleted);

CREATE TABLE IF NOT EXISTS app_user_verification_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    verify_type VARCHAR(30) NOT NULL COMMENT '认证类型：REAL_NAME/EDUCATION/AVATAR',
    status VARCHAR(30) NOT NULL COMMENT '审核状态',
    audit_source VARCHAR(20) NOT NULL DEFAULT 'MACHINE' COMMENT '审核来源：MACHINE/MANUAL',
    provider_task_id BIGINT DEFAULT NULL COMMENT 'Provider 任务 ID',
    submit_payload_json JSON DEFAULT NULL COMMENT '提交内容明文 JSON，仅服务端使用',
    masked_payload_json JSON DEFAULT NULL COMMENT '脱敏展示 JSON',
    reject_reason VARCHAR(200) DEFAULT NULL COMMENT '驳回原因',
    submit_time DATETIME DEFAULT NULL COMMENT '提交时间',
    audit_time DATETIME DEFAULT NULL COMMENT '审核时间',
    auditor_id BIGINT DEFAULT NULL COMMENT '人工审核管理员 ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_verify_record_user_type_time (user_id, verify_type, submit_time),
    INDEX idx_verify_record_type_status (verify_type, status, deleted),
    INDEX idx_verify_record_source_status (audit_source, status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户认证提交历史表';

CREATE TABLE IF NOT EXISTS app_user_profile_media (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    media_type VARCHAR(30) NOT NULL COMMENT '媒体类型：AVATAR/ALBUM/PROFILE_BG/EDUCATION_CERT',
    media_url VARCHAR(500) NOT NULL COMMENT '媒体 URL',
    thumb_url VARCHAR(500) DEFAULT NULL COMMENT '缩略图 URL',
    sort_order INT DEFAULT 0 COMMENT '排序',
    audit_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' COMMENT '审核状态',
    audit_source VARCHAR(20) NOT NULL DEFAULT 'MACHINE' COMMENT '审核来源：MACHINE/MANUAL',
    provider_task_id BIGINT DEFAULT NULL COMMENT 'Provider 任务 ID',
    machine_signal_json JSON DEFAULT NULL COMMENT '机审信号',
    reject_reason VARCHAR(200) DEFAULT NULL COMMENT '驳回原因',
    current_effective TINYINT NOT NULL DEFAULT 0 COMMENT '是否当前生效',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_profile_media_user_type (user_id, media_type, deleted),
    INDEX idx_profile_media_status_source (audit_status, audit_source, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户资料媒体审核表';

CREATE TABLE IF NOT EXISTS app_user_open_text_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    field_name VARCHAR(50) NOT NULL COMMENT 'ABOUT_ME/PROFILE_QA',
    content_text VARCHAR(1000) NOT NULL COMMENT '开放性文字明文',
    content_hash CHAR(64) DEFAULT NULL COMMENT '内容 SHA-256',
    audit_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' COMMENT '审核状态',
    audit_source VARCHAR(20) NOT NULL DEFAULT 'MACHINE' COMMENT '审核来源：MACHINE/MANUAL',
    provider_task_id BIGINT DEFAULT NULL COMMENT 'Provider 任务 ID',
    machine_signal_json JSON DEFAULT NULL COMMENT '机审信号',
    reject_reason VARCHAR(200) DEFAULT NULL COMMENT '驳回原因',
    submit_time DATETIME DEFAULT NULL COMMENT '提交时间',
    audit_time DATETIME DEFAULT NULL COMMENT '审核时间',
    current_effective TINYINT NOT NULL DEFAULT 0 COMMENT '是否当前生效',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_open_text_user_field (user_id, field_name, deleted),
    INDEX idx_open_text_status_source (audit_status, audit_source, deleted),
    INDEX idx_open_text_content_hash (content_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户开放性文字审核表';

CREATE TABLE IF NOT EXISTS app_user_voice_intro_record (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    voice_url VARCHAR(500) NOT NULL COMMENT '语音介绍音频 URL',
    duration INT NOT NULL COMMENT '语音时长，10-60 秒',
    audit_status VARCHAR(30) NOT NULL DEFAULT 'VOICE_PENDING' COMMENT '语音审核状态',
    provider_task_id BIGINT DEFAULT NULL COMMENT '音频安全 Provider 任务 ID',
    machine_signal_json JSON DEFAULT NULL COMMENT '机审信号',
    reject_reason VARCHAR(200) DEFAULT NULL COMMENT '驳回原因',
    submit_time DATETIME DEFAULT NULL COMMENT '提交时间',
    audit_time DATETIME DEFAULT NULL COMMENT '审核时间',
    current_effective TINYINT NOT NULL DEFAULT 0 COMMENT '是否当前有效',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_voice_intro_user_time (user_id, submit_time),
    INDEX idx_voice_intro_status_time (audit_status, submit_time),
    INDEX idx_voice_intro_user_effective (user_id, current_effective, deleted),
    INDEX idx_voice_intro_provider_task (provider_task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户语音介绍审核历史表';

CREATE TABLE IF NOT EXISTS external_provider_task (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    provider_type VARCHAR(50) NOT NULL COMMENT 'Provider 类型',
    provider_code VARCHAR(50) DEFAULT NULL COMMENT 'Provider 实现编码',
    user_id BIGINT DEFAULT NULL COMMENT '用户 ID',
    request_payload_json JSON DEFAULT NULL COMMENT '请求 JSON',
    response_payload_json JSON DEFAULT NULL COMMENT '响应 JSON',
    task_status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS' COMMENT '任务状态',
    mocked TINYINT NOT NULL DEFAULT 0 COMMENT '是否 mock Provider 返回',
    error_message VARCHAR(500) DEFAULT NULL COMMENT '错误信息',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_provider_task_type_status (provider_type, task_status, deleted),
    INDEX idx_provider_task_user (user_id, provider_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='外部 Provider 调用留痕表';

CREATE TABLE IF NOT EXISTS app_user_import_batch (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_no VARCHAR(64) NOT NULL COMMENT '导入批次号',
    file_name VARCHAR(200) DEFAULT NULL COMMENT '原始文件名',
    total_count INT NOT NULL DEFAULT 0 COMMENT '总行数',
    success_count INT NOT NULL DEFAULT 0 COMMENT '成功数',
    fail_count INT NOT NULL DEFAULT 0 COMMENT '失败数',
    duplicate_count INT NOT NULL DEFAULT 0 COMMENT '重复数',
    status VARCHAR(30) NOT NULL DEFAULT 'PRECHECKED' COMMENT '批次状态',
    operator_id BIGINT DEFAULT NULL COMMENT '操作人',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_import_batch_no (batch_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='App 用户导入批次表';

CREATE TABLE IF NOT EXISTS app_user_import_row (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_id BIGINT NOT NULL COMMENT '批次 ID',
    row_no INT NOT NULL COMMENT 'Excel 行号',
    raw_json JSON DEFAULT NULL COMMENT '原始行 JSON',
    status VARCHAR(30) NOT NULL COMMENT '行状态：SUCCESS/FAILED/DUPLICATE',
    fail_reason VARCHAR(500) DEFAULT NULL COMMENT '失败原因',
    user_id BIGINT DEFAULT NULL COMMENT '导入成功后的用户 ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_import_row_batch (batch_id, row_no),
    INDEX idx_import_row_status (batch_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='App 用户导入行明细表';
