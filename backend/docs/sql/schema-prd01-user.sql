-- =============================================
-- PRD-01 用户准入与资料认证初始化 DDL
-- =============================================

-- 小程序用户主表（账户 + 资料合一）
CREATE TABLE IF NOT EXISTS app_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    -- 账户字段
    openid VARCHAR(128) DEFAULT NULL COMMENT '小程序openid',
    unionid VARCHAR(128) DEFAULT NULL COMMENT '微信unionid',
    register_source VARCHAR(30) DEFAULT 'WECHAT' COMMENT '注册来源 @see RegisterSourceEnum',
    register_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
    last_login_time DATETIME DEFAULT NULL COMMENT '最近登录时间',
    account_status VARCHAR(20) DEFAULT 'NORMAL' COMMENT '账号状态 @see AccountStatusEnum',
    first_login_completed TINYINT DEFAULT 0 COMMENT '是否完成首登资料初始化',
    -- 基础资料字段
    avatar VARCHAR(500) DEFAULT NULL COMMENT '主头像URL',
    nickname VARCHAR(50) DEFAULT NULL COMMENT '昵称',
    gender VARCHAR(10) DEFAULT NULL COMMENT '性别 @see GenderEnum',
    birthday DATE DEFAULT NULL COMMENT '出生日期',
    age INT DEFAULT NULL COMMENT '年龄（系统计算）',
    height INT DEFAULT NULL COMMENT '身高cm',
    location_province VARCHAR(50) DEFAULT NULL COMMENT '居住省',
    location_city VARCHAR(50) DEFAULT NULL COMMENT '居住市',
    location_district VARCHAR(50) DEFAULT NULL COMMENT '居住区县',
    hometown_province VARCHAR(50) DEFAULT NULL COMMENT '家乡省',
    hometown_city VARCHAR(50) DEFAULT NULL COMMENT '家乡市',
    dating_goal VARCHAR(30) DEFAULT NULL COMMENT '脱单目标 @see DatingGoalEnum',
    marital_status VARCHAR(30) DEFAULT NULL COMMENT '婚姻状态 @see MaritalStatusEnum',
    emotional_status VARCHAR(30) DEFAULT NULL COMMENT '感情状态 @see EmotionalStatusEnum',
    school VARCHAR(100) DEFAULT NULL COMMENT '学校全称',
    major VARCHAR(100) DEFAULT NULL COMMENT '专业',
    education_level VARCHAR(30) DEFAULT NULL COMMENT '最高学历 @see EducationLevelEnum',
    -- 扩展资料字段
    about_me VARCHAR(500) DEFAULT NULL COMMENT '关于我',
    hope_they_know VARCHAR(500) DEFAULT NULL COMMENT '希望TA了解',
    voice_intro_url VARCHAR(500) DEFAULT NULL COMMENT '语音介绍URL',
    voice_intro_duration INT DEFAULT NULL COMMENT '语音时长秒',
    tags JSON DEFAULT NULL COMMENT '标签列表 JSON',
    photos JSON DEFAULT NULL COMMENT '相册 JSON',
    profile_bg_image VARCHAR(500) DEFAULT NULL COMMENT '资料页背景图',
    mbti_type VARCHAR(10) DEFAULT NULL COMMENT 'MBTI类型',
    zodiac VARCHAR(10) DEFAULT NULL COMMENT '星座（系统计算）',
    profile_score INT DEFAULT 0 COMMENT '资料完整度分（系统计算）',
    -- 通用字段
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_openid (openid),
    INDEX idx_account_status (account_status),
    INDEX idx_first_login (first_login_completed),
    INDEX idx_gender (gender),
    INDEX idx_school (school),
    INDEX idx_profile_score (profile_score),
    INDEX idx_register_time (register_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小程序用户主表';

-- 用户认证与审核状态表（每用户一条记录）
CREATE TABLE IF NOT EXISTS app_user_verification (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    -- 实名认证
    real_name_status VARCHAR(20) DEFAULT 'NOT_CERTIFIED' COMMENT '实名认证状态 @see VerificationStatusEnum',
    real_name VARCHAR(50) DEFAULT NULL COMMENT '真实姓名（加密存储）',
    id_card VARCHAR(20) DEFAULT NULL COMMENT '身份证号（加密存储）',
    real_name_submit_time DATETIME DEFAULT NULL COMMENT '实名认证提交时间',
    real_name_result_time DATETIME DEFAULT NULL COMMENT '实名认证结果时间',
    real_name_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '实名驳回原因',
    -- 学历认证
    education_status VARCHAR(20) DEFAULT 'NOT_CERTIFIED' COMMENT '学历认证状态 @see VerificationStatusEnum',
    education_method VARCHAR(30) DEFAULT NULL COMMENT '认证方式: CHSI/ONLINE_CODE/DIPLOMA_NO',
    education_submit_time DATETIME DEFAULT NULL COMMENT '学历认证提交时间',
    education_result_time DATETIME DEFAULT NULL COMMENT '学历认证结果时间',
    education_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '学历驳回原因',
    -- 头像认证
    avatar_verify_status VARCHAR(20) DEFAULT 'NOT_CERTIFIED' COMMENT '头像认证状态 @see VerificationStatusEnum',
    avatar_verify_submit_time DATETIME DEFAULT NULL COMMENT '头像认证提交时间',
    avatar_verify_result_time DATETIME DEFAULT NULL COMMENT '头像认证结果时间',
    avatar_verify_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '头像驳回原因',
    -- 资料附加照片审核
    profile_photo_audit_status VARCHAR(20) DEFAULT 'NOT_SUBMITTED' COMMENT '资料照片审核状态 @see ModerationStatusEnum',
    profile_photo_submit_time DATETIME DEFAULT NULL COMMENT '照片审核提交时间',
    profile_photo_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '照片驳回原因',
    -- 开放性文字审核
    open_text_audit_status VARCHAR(20) DEFAULT 'NOT_SUBMITTED' COMMENT '文字审核状态 @see ModerationStatusEnum',
    open_text_submit_time DATETIME DEFAULT NULL COMMENT '文字审核提交时间',
    open_text_reject_reason VARCHAR(200) DEFAULT NULL COMMENT '文字驳回原因',
    -- 汇总
    verify_level INT DEFAULT 0 COMMENT '已完成认证数量 0-3',
    -- 通用字段
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户认证与审核状态表';

-- =============================================
-- PRD-01 管理后台菜单权限种子数据
-- =============================================

-- 一级目录
INSERT INTO sys_menu (parent_id, menu_name, menu_type, path, component, icon, perms, menu_sort, visible, status) VALUES
(0, '用户准入', 'M', NULL, NULL, 'UserCheck', NULL, 50, 1, 'ENABLED'),
(0, '认证审核', 'M', NULL, NULL, 'Shield', NULL, 60, 1, 'ENABLED'),
(0, '内容审核', 'M', NULL, NULL, 'FileCheck', NULL, 70, 1, 'ENABLED')
ON DUPLICATE KEY UPDATE menu_name = VALUES(menu_name);

-- 子菜单：用户准入
INSERT INTO sys_menu (parent_id, menu_name, menu_type, path, component, icon, perms, menu_sort, visible, status)
SELECT m.id, 'App用户管理', 'C', '/users/app', 'users/AppUserManagement', 'Users', 'user:app:list', 1, 1, 'ENABLED'
FROM sys_menu m WHERE m.menu_name = '用户准入' AND m.parent_id = 0
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'user:app:list' AND menu_type = 'C');

-- 功能按钮：用户管理
INSERT INTO sys_menu (parent_id, menu_name, menu_type, perms, menu_sort, visible, status)
SELECT m.id, '查看详情', 'F', 'user:app:detail', 1, 0, 'ENABLED'
FROM sys_menu m WHERE m.perms = 'user:app:list' AND m.menu_type = 'C'
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'user:app:detail' AND menu_type = 'F');

INSERT INTO sys_menu (parent_id, menu_name, menu_type, perms, menu_sort, visible, status)
SELECT m.id, '冻结解冻', 'F', 'user:app:freeze', 2, 0, 'ENABLED'
FROM sys_menu m WHERE m.perms = 'user:app:list' AND m.menu_type = 'C'
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'user:app:freeze' AND menu_type = 'F');

-- 子菜单：认证审核
INSERT INTO sys_menu (parent_id, menu_name, menu_type, path, component, perms, menu_sort, visible, status)
SELECT m.id, '实名认证审核', 'C', '/verify/real-name', 'verify/VerificationManagementPage', 'verify:realname:list', 1, 1, 'ENABLED'
FROM sys_menu m WHERE m.menu_name = '认证审核' AND m.parent_id = 0
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'verify:realname:list' AND menu_type = 'C');

INSERT INTO sys_menu (parent_id, menu_name, menu_type, path, component, perms, menu_sort, visible, status)
SELECT m.id, '学历认证审核', 'C', '/verify/education', 'verify/VerificationManagementPage', 'verify:education:list', 2, 1, 'ENABLED'
FROM sys_menu m WHERE m.menu_name = '认证审核' AND m.parent_id = 0
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'verify:education:list' AND menu_type = 'C');

INSERT INTO sys_menu (parent_id, menu_name, menu_type, path, component, perms, menu_sort, visible, status)
SELECT m.id, '头像认证审核', 'C', '/verify/avatar', 'verify/VerificationManagementPage', 'verify:avatar:list', 3, 1, 'ENABLED'
FROM sys_menu m WHERE m.menu_name = '认证审核' AND m.parent_id = 0
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'verify:avatar:list' AND menu_type = 'C');

-- 功能按钮：认证审核
INSERT INTO sys_menu (parent_id, menu_name, menu_type, perms, menu_sort, visible, status)
SELECT m.id, '实名审核', 'F', 'verify:realname:audit', 1, 0, 'ENABLED'
FROM sys_menu m WHERE m.perms = 'verify:realname:list' AND m.menu_type = 'C'
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'verify:realname:audit' AND menu_type = 'F');

INSERT INTO sys_menu (parent_id, menu_name, menu_type, perms, menu_sort, visible, status)
SELECT m.id, '学历审核', 'F', 'verify:education:audit', 1, 0, 'ENABLED'
FROM sys_menu m WHERE m.perms = 'verify:education:list' AND m.menu_type = 'C'
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'verify:education:audit' AND menu_type = 'F');

INSERT INTO sys_menu (parent_id, menu_name, menu_type, perms, menu_sort, visible, status)
SELECT m.id, '头像审核', 'F', 'verify:avatar:audit', 1, 0, 'ENABLED'
FROM sys_menu m WHERE m.perms = 'verify:avatar:list' AND m.menu_type = 'C'
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'verify:avatar:audit' AND menu_type = 'F');

-- 子菜单：内容审核
INSERT INTO sys_menu (parent_id, menu_name, menu_type, path, component, perms, menu_sort, visible, status)
SELECT m.id, '资料照片审核', 'C', '/moderation/photos', 'moderation/ModerationPage', 'moderation:photo:list', 1, 1, 'ENABLED'
FROM sys_menu m WHERE m.menu_name = '内容审核' AND m.parent_id = 0
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'moderation:photo:list' AND menu_type = 'C');

INSERT INTO sys_menu (parent_id, menu_name, menu_type, path, component, perms, menu_sort, visible, status)
SELECT m.id, '文字内容审核', 'C', '/moderation/texts', 'moderation/ModerationPage', 'moderation:text:list', 2, 1, 'ENABLED'
FROM sys_menu m WHERE m.menu_name = '内容审核' AND m.parent_id = 0
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'moderation:text:list' AND menu_type = 'C');

-- 功能按钮：内容审核
INSERT INTO sys_menu (parent_id, menu_name, menu_type, perms, menu_sort, visible, status)
SELECT m.id, '照片审核', 'F', 'moderation:photo:audit', 1, 0, 'ENABLED'
FROM sys_menu m WHERE m.perms = 'moderation:photo:list' AND m.menu_type = 'C'
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'moderation:photo:audit' AND menu_type = 'F');

INSERT INTO sys_menu (parent_id, menu_name, menu_type, perms, menu_sort, visible, status)
SELECT m.id, '文字审核', 'F', 'moderation:text:audit', 1, 0, 'ENABLED'
FROM sys_menu m WHERE m.perms = 'moderation:text:list' AND m.menu_type = 'C'
AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'moderation:text:audit' AND menu_type = 'F');

-- 为超级管理员角色（id=1）授予所有 PRD-01 菜单权限
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT 1, id FROM sys_menu WHERE perms IN (
    'user:app:list', 'user:app:detail', 'user:app:freeze',
    'verify:realname:list', 'verify:realname:audit',
    'verify:education:list', 'verify:education:audit',
    'verify:avatar:list', 'verify:avatar:audit',
    'moderation:photo:list', 'moderation:photo:audit',
    'moderation:text:list', 'moderation:text:audit'
);
