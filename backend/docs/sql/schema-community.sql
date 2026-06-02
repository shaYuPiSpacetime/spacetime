-- ======================================================
-- PRD-05 社区互动模块 DDL
-- 包含：社区动态、评论、点赞、关注、举报、社区配置种子、首页Tab种子、后台菜单种子
-- ======================================================

CREATE TABLE IF NOT EXISTS community_post (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    author_id BIGINT NOT NULL COMMENT '作者用户ID',
    post_type VARCHAR(30) NOT NULL COMMENT 'community/sincere_post',
    title VARCHAR(200) DEFAULT NULL COMMENT '诚意贴标题',
    content VARCHAR(2000) NOT NULL COMMENT '正文内容',
    image_urls TEXT DEFAULT NULL COMMENT '图片JSON数组',
    topic_id BIGINT DEFAULT NULL COMMENT '话题字典数据ID',
    mention_user_ids VARCHAR(500) DEFAULT NULL COMMENT '@用户ID列表，逗号分隔',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/PUBLISHED/REJECTED/DELETED/BLOCKED',
    audit_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/APPROVED/REJECTED',
    audit_remark VARCHAR(500) DEFAULT NULL COMMENT '审核说明',
    like_count INT NOT NULL DEFAULT 0 COMMENT '点赞数',
    comment_count INT NOT NULL DEFAULT 0 COMMENT '评论数',
    report_count INT NOT NULL DEFAULT 0 COMMENT '举报次数',
    deleted_by_user TINYINT NOT NULL DEFAULT 0 COMMENT '用户主动删除标记',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_post_author (author_id, deleted),
    INDEX idx_post_type_status (post_type, status, deleted),
    INDEX idx_post_audit (audit_status, update_time),
    INDEX idx_post_topic (topic_id, status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区动态与诚意贴';

CREATE TABLE IF NOT EXISTS community_comment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL COMMENT '所属内容ID',
    author_id BIGINT NOT NULL COMMENT '评论作者ID',
    parent_comment_id BIGINT DEFAULT NULL COMMENT '父评论ID',
    reply_user_id BIGINT DEFAULT NULL COMMENT '回复目标用户ID',
    content VARCHAR(1000) NOT NULL COMMENT '评论内容',
    status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED' COMMENT 'PUBLISHED/REJECTED/DELETED/BLOCKED',
    audit_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/APPROVED/REJECTED',
    audit_remark VARCHAR(500) DEFAULT NULL COMMENT '审核说明',
    report_count INT NOT NULL DEFAULT 0 COMMENT '举报次数',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_comment_post (post_id, deleted),
    INDEX idx_comment_author (author_id, deleted),
    INDEX idx_comment_parent (parent_comment_id, deleted),
    INDEX idx_comment_audit (audit_status, update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区评论';

CREATE TABLE IF NOT EXISTS community_like (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT NOT NULL COMMENT '动态ID',
    user_id BIGINT NOT NULL COMMENT '点赞用户ID',
    status VARCHAR(30) NOT NULL DEFAULT 'ENABLED' COMMENT 'ENABLED/DISABLED',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_post_user (post_id, user_id),
    INDEX idx_like_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='点赞关系表';

CREATE TABLE IF NOT EXISTS community_follow (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    follower_id BIGINT NOT NULL COMMENT '关注者ID',
    target_user_id BIGINT NOT NULL COMMENT '被关注者ID',
    status VARCHAR(30) NOT NULL DEFAULT 'FOLLOW' COMMENT 'FOLLOW/UNFOLLOW',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    UNIQUE KEY uk_follow_pair (follower_id, target_user_id),
    INDEX idx_follow_target (target_user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='关注关系表';

CREATE TABLE IF NOT EXISTS community_report (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reporter_id BIGINT NOT NULL COMMENT '举报人ID',
    target_type VARCHAR(30) NOT NULL COMMENT 'post/comment/user',
    target_id BIGINT NOT NULL COMMENT '目标ID',
    reason_code VARCHAR(100) NOT NULL COMMENT '举报原因字典值',
    extra_text VARCHAR(1000) DEFAULT NULL COMMENT '补充说明',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/RESOLVED/REJECTED',
    handle_action VARCHAR(30) DEFAULT NULL COMMENT 'DISMISS/BLOCK_POST/BLOCK_COMMENT/WARN_USER',
    handle_remark VARCHAR(1000) DEFAULT NULL COMMENT '处理说明',
    handler_id BIGINT DEFAULT NULL COMMENT '处理人ID',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0,
    INDEX idx_report_target (target_type, target_id, deleted),
    INDEX idx_report_status (status, update_time),
    INDEX idx_report_user (reporter_id, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='社区举报单';

-- ======================================================
-- 字典种子：社区话题、举报原因
-- ======================================================

INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark)
VALUES
('社区话题', 'community_topic', 20, 'ENABLED', 'PRD-05 社区与诚意贴话题'),
('社区举报原因', 'community_report_reason', 21, 'ENABLED', 'PRD-05 社区举报原因')
ON DUPLICATE KEY UPDATE
    dict_name = VALUES(dict_name),
    dict_sort = VALUES(dict_sort),
    status = VALUES(status),
    remark = VALUES(remark);

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark)
SELECT 'community_topic', 0, '露营交友', 'camp', 1, 'ENABLED', '社区默认话题'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'community_topic' AND dict_value = 'camp');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark)
SELECT 'community_topic', 0, '认真脱单', 'serious_love', 2, 'ENABLED', '诚意贴默认话题'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'community_topic' AND dict_value = 'serious_love');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark)
SELECT 'community_topic', 0, '周末搭子', 'weekend_buddy', 3, 'ENABLED', '社区默认话题'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'community_topic' AND dict_value = 'weekend_buddy');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark)
SELECT 'community_report_reason', 0, '广告营销', 'spam', 1, 'ENABLED', '社区举报原因'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'community_report_reason' AND dict_value = 'spam');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark)
SELECT 'community_report_reason', 0, '辱骂攻击', 'abuse', 2, 'ENABLED', '社区举报原因'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'community_report_reason' AND dict_value = 'abuse');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark)
SELECT 'community_report_reason', 0, '不实信息', 'fake_info', 3, 'ENABLED', '社区举报原因'
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'community_report_reason' AND dict_value = 'fake_info');

-- ======================================================
-- 配置种子：社区规则
-- ======================================================

INSERT INTO app_config (config_key, config_value, config_group, config_type, public_visible, status, remark)
VALUES
('community.interaction_gate_mode', 'LOGIN_ONLY', 'COMMUNITY', 'TEXT', 1, 'ENABLED', '互动准入模式：LOGIN_ONLY/FULL_CERT'),
('community.post_max_images', '9', 'COMMUNITY', 'NUMBER', 1, 'ENABLED', '动态图片上限'),
('community.post_max_text_length', '500', 'COMMUNITY', 'NUMBER', 1, 'ENABLED', '动态文字上限'),
('community.post_max_mentions', '5', 'COMMUNITY', 'NUMBER', 1, 'ENABLED', '@用户人数上限'),
('community.sincere_post_min_text_length', '20', 'COMMUNITY', 'NUMBER', 1, 'ENABLED', '诚意贴正文下限'),
('community.contact_info_allowed', 'false', 'COMMUNITY', 'BOOLEAN', 1, 'ENABLED', '诚意贴联系方式开关'),
('community.report_entry_enabled', 'true', 'COMMUNITY', 'BOOLEAN', 1, 'ENABLED', '举报入口开关')
ON DUPLICATE KEY UPDATE
    config_value = VALUES(config_value),
    config_group = VALUES(config_group),
    config_type = VALUES(config_type),
    public_visible = VALUES(public_visible),
    status = VALUES(status),
    remark = VALUES(remark);

-- ======================================================
-- 首页Tab轻配置种子
-- ======================================================

INSERT INTO mobile_entry_config
(page_code, entry_key, entry_name, icon, jump_type, jump_target, badge_text, badge_type, login_required, sort, status)
VALUES
('COMMUNITY_HOME_TAB', 'follow', '关注', NULL, 'NONE', NULL, NULL, 'NONE', 1, 10, 'ENABLED'),
('COMMUNITY_HOME_TAB', 'same_city', '同城', NULL, 'NONE', NULL, NULL, 'NONE', 1, 20, 'ENABLED'),
('COMMUNITY_HOME_TAB', 'discover', '发现', NULL, 'NONE', NULL, NULL, 'NONE', 1, 30, 'ENABLED')
ON DUPLICATE KEY UPDATE
    entry_name = VALUES(entry_name),
    jump_type = VALUES(jump_type),
    jump_target = VALUES(jump_target),
    badge_text = VALUES(badge_text),
    badge_type = VALUES(badge_type),
    login_required = VALUES(login_required),
    sort = VALUES(sort),
    status = VALUES(status);

-- ======================================================
-- 后台菜单种子
-- ======================================================

INSERT INTO sys_menu (id, parent_id, menu_name, menu_type, path, component, icon, perms, menu_sort, visible, status, remark)
VALUES
(880, 0, '社区互动管理', 'M', NULL, NULL, 'MessageSquare', NULL, 88, 1, 'ENABLED', 'PRD-05 社区互动管理'),
(881, 880, '内容审核', 'C', '/community/posts', 'community/CommunityManagementPage', NULL, 'community:post:list', 1, 1, 'ENABLED', NULL),
(882, 881, '内容审核操作', 'F', NULL, NULL, NULL, 'community:post:audit', 1, 0, 'ENABLED', NULL),
(883, 880, '评论审核', 'C', '/community/comments', 'community/CommunityManagementPage', NULL, 'community:comment:list', 2, 1, 'ENABLED', NULL),
(884, 883, '评论审核操作', 'F', NULL, NULL, NULL, 'community:comment:audit', 1, 0, 'ENABLED', NULL),
(885, 880, '举报处理', 'C', '/community/reports', 'community/CommunityManagementPage', NULL, 'community:report:list', 3, 1, 'ENABLED', NULL),
(886, 885, '举报处理操作', 'F', NULL, NULL, NULL, 'community:report:handle', 1, 0, 'ENABLED', NULL),
(887, 880, '社区配置', 'C', '/community/configs', 'community/CommunityManagementPage', NULL, 'community:config:list', 4, 1, 'ENABLED', NULL),
(888, 887, '社区配置编辑', 'F', NULL, NULL, NULL, 'community:config:edit', 1, 0, 'ENABLED', NULL)
ON DUPLICATE KEY UPDATE
    menu_name = VALUES(menu_name),
    parent_id = VALUES(parent_id),
    menu_type = VALUES(menu_type),
    path = VALUES(path),
    component = VALUES(component),
    icon = VALUES(icon),
    perms = VALUES(perms),
    menu_sort = VALUES(menu_sort),
    visible = VALUES(visible),
    status = VALUES(status),
    remark = VALUES(remark);

INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT 1, id FROM sys_menu WHERE id BETWEEN 880 AND 888;
