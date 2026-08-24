-- PRD-01 用户准入与资料认证初始化
-- 小程序用户主表
CREATE TABLE IF NOT EXISTS `app_user` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
    `openid` VARCHAR(64) DEFAULT NULL COMMENT '小程序openid',
    `unionid` VARCHAR(64) DEFAULT NULL COMMENT '微信unionid',
    `register_source` VARCHAR(32) DEFAULT NULL COMMENT '注册来源',
    `register_time` DATETIME DEFAULT NULL COMMENT '注册时间',
    `last_login_time` DATETIME DEFAULT NULL COMMENT '最近登录时间',
    `account_status` VARCHAR(32) DEFAULT 'ACTIVE' COMMENT '账号状态',
    `first_login_completed` TINYINT DEFAULT 0 COMMENT '是否完成首登资料初始化',
    `first_login_next_step` TINYINT DEFAULT 1 COMMENT '首登下一待填写步骤，完成后为空',

    `nickname` VARCHAR(64) DEFAULT NULL COMMENT '昵称',
    `gender` VARCHAR(8) DEFAULT NULL COMMENT '性别',
    `birthday` DATE DEFAULT NULL COMMENT '出生日期',
    `age` INT DEFAULT NULL COMMENT '年龄（系统计算）',
    `height` INT DEFAULT NULL COMMENT '身高cm',
    `weight` INT DEFAULT NULL COMMENT '体重kg',
    `identity` VARCHAR(32) DEFAULT NULL COMMENT '身份字典code：app_identity',
    `industry` VARCHAR(50) DEFAULT NULL COMMENT '行业字典code：app_industry',
    `occupation` VARCHAR(100) DEFAULT NULL COMMENT '职业字典code：app_occupation',
    `company` VARCHAR(100) DEFAULT NULL COMMENT '公司名称',
    `annual_income` VARCHAR(50) DEFAULT NULL COMMENT '年收入字典code：app_annual_income',
    `location_province` VARCHAR(64) DEFAULT NULL COMMENT '居住省',
    `location_city` VARCHAR(64) DEFAULT NULL COMMENT '居住市',
    `location_district` VARCHAR(64) DEFAULT NULL COMMENT '居住区县',
    `hometown_province` VARCHAR(64) DEFAULT NULL COMMENT '家乡省',
    `hometown_city` VARCHAR(64) DEFAULT NULL COMMENT '家乡市',
    `dating_goal` VARCHAR(64) DEFAULT NULL COMMENT '脱单目标',
    `marital_status` VARCHAR(32) DEFAULT NULL COMMENT '婚姻状况字典code：app_marital_status',
    `emotional_status` VARCHAR(32) DEFAULT NULL COMMENT '感情状态',
    `school` VARCHAR(128) DEFAULT NULL COMMENT '学校全称',
    `major` VARCHAR(128) DEFAULT NULL COMMENT '专业',
    `education_level` VARCHAR(32) DEFAULT NULL COMMENT '学历字典code：app_education_level',

    `tags` TEXT DEFAULT NULL COMMENT '标签列表JSON',
    `wechat_id` VARCHAR(64) DEFAULT NULL COMMENT '微信号，仅本人资料页可见',
    `favorite_song_id` VARCHAR(128) DEFAULT NULL COMMENT '爱听歌曲三方ID',
    `favorite_song_name` VARCHAR(128) DEFAULT NULL COMMENT '爱听歌曲名称',
    `favorite_song_artist` VARCHAR(128) DEFAULT NULL COMMENT '爱听歌曲歌手',
    `favorite_song_cover_url` VARCHAR(255) DEFAULT NULL COMMENT '爱听歌曲封面URL',
    `mbti_type` VARCHAR(16) DEFAULT NULL COMMENT 'MBTI类型',
    `zodiac` VARCHAR(16) DEFAULT NULL COMMENT '星座（系统计算）',
    `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
    `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
    `created_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
    `updated_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    `deleted` INT DEFAULT 0 COMMENT '逻辑删除标记',
    PRIMARY KEY (`id`),
    INDEX `idx_openid` (`openid`),
    INDEX `idx_account_status` (`account_status`),
    INDEX `idx_nickname` (`nickname`),
    INDEX `idx_school` (`school`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小程序用户主表';

-- 用户认证与审核状态表
CREATE TABLE IF NOT EXISTS `app_user_verification` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `real_name_status` VARCHAR(32) DEFAULT 'NOT_SUBMITTED' COMMENT '实名认证状态',
    `real_name` VARCHAR(128) DEFAULT NULL COMMENT '真实姓名（加密存储）',
    `id_card` VARCHAR(128) DEFAULT NULL COMMENT '身份证号（加密存储）',
    `real_name_submit_time` DATETIME DEFAULT NULL COMMENT '实名认证提交时间',
    `real_name_result_time` DATETIME DEFAULT NULL COMMENT '实名认证结果时间',
    `real_name_reject_reason` VARCHAR(512) DEFAULT NULL COMMENT '实名驳回原因',
    `education_status` VARCHAR(32) DEFAULT 'NOT_SUBMITTED' COMMENT '学历认证状态',
    `education_method` VARCHAR(32) DEFAULT NULL COMMENT '认证方式',
    `education_submit_time` DATETIME DEFAULT NULL COMMENT '学历认证提交时间',
    `education_result_time` DATETIME DEFAULT NULL COMMENT '学历认证结果时间',
    `education_reject_reason` VARCHAR(512) DEFAULT NULL COMMENT '学历驳回原因',
    `avatar_verify_status` VARCHAR(32) DEFAULT 'NOT_SUBMITTED' COMMENT '头像认证状态',
    `avatar_verify_submit_time` DATETIME DEFAULT NULL COMMENT '头像认证提交时间',
    `avatar_verify_result_time` DATETIME DEFAULT NULL COMMENT '头像认证结果时间',
    `avatar_verify_reject_reason` VARCHAR(512) DEFAULT NULL COMMENT '头像驳回原因',
    `profile_photo_audit_status` VARCHAR(32) DEFAULT 'NOT_SUBMITTED' COMMENT '资料照片审核状态',
    `profile_photo_submit_time` DATETIME DEFAULT NULL COMMENT '照片审核提交时间',
    `profile_photo_reject_reason` VARCHAR(512) DEFAULT NULL COMMENT '照片驳回原因',
    `open_text_audit_status` VARCHAR(32) DEFAULT 'NOT_SUBMITTED' COMMENT '文字审核状态',
    `open_text_submit_time` DATETIME DEFAULT NULL COMMENT '文字审核提交时间',
    `open_text_reject_reason` VARCHAR(512) DEFAULT NULL COMMENT '文字驳回原因',
    `verify_level` INT DEFAULT 0 COMMENT '已完成认证数量',
    `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
    `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
    `created_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
    `updated_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
    `deleted` INT DEFAULT 0 COMMENT '逻辑删除标记',
    PRIMARY KEY (`id`),
    UNIQUE INDEX `uk_user_id` (`user_id`),
    INDEX `idx_real_name_status` (`real_name_status`),
    INDEX `idx_education_status` (`education_status`),
    INDEX `idx_avatar_verify_status` (`avatar_verify_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户认证与审核状态表';

-- =============================================
-- 2026-07-07 本轮确认增量：准入、审核历史、Provider、语音、导入导出
-- =============================================

ALTER TABLE app_user
    ADD COLUMN phone VARCHAR(20) DEFAULT NULL COMMENT '绑定手机号明文，展示时业务脱敏',
    ADD COLUMN phone_hash CHAR(64) DEFAULT NULL COMMENT '手机号规范化后 SHA-256，用于查询去重',
    ADD COLUMN identity VARCHAR(30) DEFAULT NULL COMMENT '身份字典code：app_identity',
    ADD COLUMN industry VARCHAR(50) DEFAULT NULL COMMENT '行业字典code：app_industry',
    ADD COLUMN weight INT DEFAULT NULL COMMENT '体重 kg',
    ADD COLUMN occupation VARCHAR(100) DEFAULT NULL COMMENT '职业字典code：app_occupation',
    ADD COLUMN annual_income VARCHAR(50) DEFAULT NULL COMMENT '年收入字典code：app_annual_income',
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
    ADD COLUMN profile_photo_audit_source VARCHAR(20) NOT NULL DEFAULT 'MACHINE' COMMENT '资料照片审核来源：MACHINE/MANUAL',
    ADD COLUMN open_text_audit_source VARCHAR(20) NOT NULL DEFAULT 'MACHINE' COMMENT '开放性文字审核来源：MACHINE/MANUAL',
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
    external_task_id VARCHAR(128) DEFAULT NULL COMMENT '三方异步任务编号，如微信内容安全 trace_id',
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
    INDEX idx_provider_task_user (user_id, provider_type),
    INDEX idx_provider_task_external (provider_code, external_task_id, deleted)
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

INSERT INTO sys_menu (parent_id, menu_name, menu_type, perms, menu_sort, visible, status)
SELECT m.id, '批量导入', 'F', 'user:app:import', 3, 0, 'ENABLED'
FROM sys_menu m WHERE m.perms = 'user:app:list' AND m.menu_type = 'C'
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'user:app:import' AND menu_type = 'F');

INSERT INTO sys_menu (parent_id, menu_name, menu_type, perms, menu_sort, visible, status)
SELECT m.id, '导出固定字段', 'F', 'user:app:export', 4, 0, 'ENABLED'
FROM sys_menu m WHERE m.perms = 'user:app:list' AND m.menu_type = 'C'
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'user:app:export' AND menu_type = 'F');

INSERT INTO sys_menu (parent_id, menu_name, menu_type, perms, menu_sort, visible, status)
SELECT m.id, '敏感字段明文查看', 'F', 'user:app:sensitive:view', 5, 0, 'ENABLED'
FROM sys_menu m WHERE m.perms = 'user:app:list' AND m.menu_type = 'C'
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'user:app:sensitive:view' AND menu_type = 'F');

INSERT INTO sys_menu (parent_id, menu_name, menu_type, path, component, icon, perms, menu_sort, visible, status)
SELECT m.parent_id, '准入配置', 'C', '/access/config', 'access/AccessConfigPage', 'Settings', 'access:config:list', 7, 1, 'ENABLED'
FROM sys_menu m WHERE m.perms = 'user:app:list' AND m.menu_type = 'C'
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'access:config:list' AND menu_type = 'C');

INSERT INTO sys_menu (parent_id, menu_name, menu_type, perms, menu_sort, visible, status)
SELECT m.id, '保存准入配置', 'F', 'access:config:edit', 1, 0, 'ENABLED'
FROM sys_menu m WHERE m.perms = 'access:config:list' AND m.menu_type = 'C'
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'access:config:edit' AND menu_type = 'F');

INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT 1, id FROM sys_menu WHERE perms IN (
    'user:app:import', 'user:app:export', 'user:app:sensitive:view',
    'access:config:list', 'access:config:edit'
);

INSERT INTO app_config (config_key, config_value, config_group, config_type, public_visible, status, remark)
VALUES
('prd01.access.requireRealName', 'true', 'PRD01_ACCESS', 'BOOLEAN', 0, 'ENABLED', '必须实名通过'),
('prd01.access.requireAvatar', 'true', 'PRD01_ACCESS', 'BOOLEAN', 0, 'ENABLED', '必须头像通过'),
('prd01.access.requireEducation', 'true', 'PRD01_ACCESS', 'BOOLEAN', 0, 'ENABLED', '必须学历通过'),
('prd01.access.minProfileScore', '80', 'PRD01_ACCESS', 'NUMBER', 0, 'ENABLED', '资料完整度最低分'),
('prd01.profile.requireAboutMe', 'true', 'PRD01_PROFILE_FIELD', 'BOOLEAN', 0, 'ENABLED', '关于我必填'),
('prd01.profile.requireQaCount', '3', 'PRD01_PROFILE_FIELD', 'NUMBER', 0, 'ENABLED', '资料问答最少条数'),
('prd01.profile.allowOverseasRegion', 'false', 'PRD01_PROFILE_FIELD', 'BOOLEAN', 0, 'ENABLED', '现居地/家乡不支持海外国家'),
('prd01.upload.avatar.max_mb', '5', 'PRD01_UPLOAD', 'NUMBER', 0, 'ENABLED', '头像最大 MB'),
('prd01.upload.album.max_count', '6', 'PRD01_UPLOAD', 'NUMBER', 0, 'ENABLED', '相册最多张数'),
('prd01.upload.voice.min_duration', '10', 'PRD01_UPLOAD', 'NUMBER', 0, 'ENABLED', '语音介绍最短秒数'),
('prd01.upload.voice.max_duration', '60', 'PRD01_UPLOAD', 'NUMBER', 0, 'ENABLED', '语音介绍最长秒数'),
('prd01.audit.voice.provider', 'MOCK', 'PRD01_AUDIT', 'TEXT', 0, 'ENABLED', '语音 Provider 首版 mock 成功'),
('prd01.audit.text.provider', 'MOCK', 'PRD01_AUDIT', 'TEXT', 0, 'ENABLED', '文字 Provider 首版 mock 成功'),
('prd01.audit.open_text.types', 'ABOUT_ME,PROFILE_QA', 'PRD01_AUDIT', 'TEXT', 0, 'ENABLED', '开放性文字审核类型'),
('prd01.audit.show_source', 'true', 'PRD01_AUDIT', 'BOOLEAN', 0, 'ENABLED', '审核来源筛选与列表展示')
ON DUPLICATE KEY UPDATE
    config_value = VALUES(config_value),
    config_group = VALUES(config_group),
    config_type = VALUES(config_type),
    public_visible = VALUES(public_visible),
    status = VALUES(status),
    remark = VALUES(remark),
    update_time = CURRENT_TIMESTAMP,
    deleted = 0;
