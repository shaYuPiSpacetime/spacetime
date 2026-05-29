-- ======================================================
-- PRD-06 公共内容与移动端配置模块 DDL
-- 包含：内容文章、应用配置、移动端入口、搜索热词、搜索屏蔽词、操作审计
-- ======================================================

CREATE TABLE IF NOT EXISTS content_article (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(30) NOT NULL COMMENT '文章类型 @see ArticleTypeEnum',
    category VARCHAR(50) DEFAULT NULL COMMENT '子分类/内容分类',
    title VARCHAR(100) NOT NULL COMMENT '标题',
    summary VARCHAR(300) DEFAULT '' COMMENT '摘要',
    cover_url VARCHAR(500) DEFAULT NULL COMMENT '封面图 URL',
    content_type VARCHAR(20) NOT NULL COMMENT '内容类型 @see ContentTypeEnum: H5/NATIVE',
    content_url VARCHAR(500) DEFAULT NULL COMMENT 'H5 跳转地址',
    content_body TEXT DEFAULT NULL COMMENT '原生内容正文',
    sort INT DEFAULT 0 COMMENT '排序号，越小越靠前',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态 @see CommonStatusEnum',
    effective_time DATETIME DEFAULT NULL COMMENT '生效时间，NULL 表示立即生效',
    expire_time DATETIME DEFAULT NULL COMMENT '失效时间，NULL 表示长期有效',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    INDEX idx_content_article_type_status (type, status, deleted),
    INDEX idx_content_article_category (category, status, deleted),
    INDEX idx_content_article_time (effective_time, expire_time),
    INDEX idx_content_article_sort (sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公共内容文章表';

CREATE TABLE IF NOT EXISTS app_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL COMMENT '配置键，唯一',
    config_value TEXT DEFAULT NULL COMMENT '配置值',
    config_group VARCHAR(50) DEFAULT 'DEFAULT' COMMENT '配置分组 @see ConfigGroupEnum',
    config_type VARCHAR(20) DEFAULT 'TEXT' COMMENT '配置类型 @see ConfigTypeEnum',
    public_visible TINYINT DEFAULT 0 COMMENT '是否允许小程序公共接口返回：0=否，1=是',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态 @see CommonStatusEnum',
    remark VARCHAR(200) DEFAULT '' COMMENT '备注说明',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    active_config_key VARCHAR(100) GENERATED ALWAYS AS (CASE WHEN deleted = 0 THEN config_key ELSE NULL END) STORED COMMENT '未删除配置唯一键',
    UNIQUE KEY uk_app_config_key (active_config_key),
    INDEX idx_app_config_group (config_group, status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='应用配置表';

CREATE TABLE IF NOT EXISTS mobile_entry_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    page_code VARCHAR(50) NOT NULL COMMENT '页面编码 @see MobilePageCodeEnum',
    entry_key VARCHAR(100) NOT NULL COMMENT '入口稳定业务键',
    entry_name VARCHAR(50) NOT NULL COMMENT '入口展示名称',
    icon VARCHAR(100) DEFAULT NULL COMMENT '入口图标标识',
    jump_type VARCHAR(30) NOT NULL COMMENT '跳转类型 @see JumpTypeEnum',
    jump_target VARCHAR(500) DEFAULT NULL COMMENT '跳转目标',
    badge_text VARCHAR(30) DEFAULT NULL COMMENT '角标文案',
    badge_type VARCHAR(20) DEFAULT 'NONE' COMMENT '角标类型：TEXT/DOT/NONE',
    login_required TINYINT DEFAULT 0 COMMENT '是否需要登录：0=否，1=是',
    sort INT DEFAULT 0 COMMENT '排序号，越小越靠前',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态 @see CommonStatusEnum',
    extra_json TEXT DEFAULT NULL COMMENT '扩展 JSON',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    active_entry_key VARCHAR(100) GENERATED ALWAYS AS (CASE WHEN deleted = 0 THEN entry_key ELSE NULL END) STORED COMMENT '未删除入口唯一键',
    UNIQUE KEY uk_mobile_entry_page_key (page_code, active_entry_key),
    INDEX idx_mobile_entry_page_status (page_code, status, deleted),
    INDEX idx_mobile_entry_sort (sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='移动端入口配置表';

CREATE TABLE IF NOT EXISTS search_hot_word (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    word VARCHAR(30) NOT NULL COMMENT '热词内容',
    scene VARCHAR(30) DEFAULT 'GLOBAL' COMMENT '适用场景：GLOBAL/USER/POST/TOPIC',
    sort INT DEFAULT 0 COMMENT '排序号，越小越靠前',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态 @see CommonStatusEnum',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    INDEX idx_search_hot_scene_status (scene, status, deleted),
    INDEX idx_search_hot_sort (sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='搜索热词表';

CREATE TABLE IF NOT EXISTS search_block_word (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    word VARCHAR(50) NOT NULL COMMENT '屏蔽词内容',
    block_type VARCHAR(30) NOT NULL COMMENT '屏蔽类型 @see SearchBlockTypeEnum',
    match_type VARCHAR(20) DEFAULT 'FUZZY' COMMENT '匹配类型 @see MatchTypeEnum',
    reason_code VARCHAR(50) DEFAULT NULL COMMENT '屏蔽原因字典值',
    hit_message VARCHAR(200) DEFAULT NULL COMMENT '命中提示文案',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态 @see CommonStatusEnum',
    remark VARCHAR(200) DEFAULT '' COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    INDEX idx_search_block_type_status (block_type, status, deleted),
    INDEX idx_search_block_word (word)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='搜索屏蔽词/违规词表';

CREATE TABLE IF NOT EXISTS content_operation_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    biz_type VARCHAR(50) NOT NULL COMMENT '业务类型：ARTICLE/APP_CONFIG/MOBILE_ENTRY/HOT_WORD/BLOCK_WORD',
    biz_id BIGINT DEFAULT NULL COMMENT '业务主键',
    action VARCHAR(50) NOT NULL COMMENT '动作：CREATE/UPDATE/ENABLE/DISABLE/DELETE/SORT',
    before_value TEXT DEFAULT NULL COMMENT '变更前摘要 JSON',
    after_value TEXT DEFAULT NULL COMMENT '变更后摘要 JSON',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    INDEX idx_content_log_biz (biz_type, biz_id),
    INDEX idx_content_log_action_time (action, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公共内容配置操作日志';

-- ======================================================
-- 种子数据：应用配置
-- ======================================================
INSERT INTO app_config (config_key, config_value, config_group, config_type, public_visible, status, remark) VALUES
('agreement.user_agreement', '', 'AGREEMENT', 'URL', 1, 'ENABLED', '用户协议 H5 地址'),
('agreement.privacy_policy', '', 'AGREEMENT', 'URL', 1, 'ENABLED', '隐私政策 H5 地址'),
('agreement.privacy_summary', '', 'AGREEMENT', 'URL', 1, 'ENABLED', '隐私摘要 H5 地址'),
('agreement.community_rules', '', 'AGREEMENT', 'URL', 1, 'ENABLED', '社区规则 H5 地址'),
('agreement.platform_rules', '', 'AGREEMENT', 'URL', 1, 'ENABLED', '平台规则 H5 地址'),
('agreement.third_party_list', '', 'AGREEMENT', 'URL', 1, 'ENABLED', '第三方信息共享清单 H5 地址'),
('agreement.personal_info_list', '', 'AGREEMENT', 'URL', 1, 'ENABLED', '个人信息收集清单 H5 地址'),
('about.about_us', '', 'ABOUT', 'TEXT', 1, 'ENABLED', '关于我们文案或 H5 地址'),
('about.app_version', '1.0.0', 'ABOUT', 'TEXT', 1, 'ENABLED', '当前版本号'),
('search.empty_state_text', '暂无搜索结果，换个关键词试试', 'SEARCH', 'TEXT', 1, 'ENABLED', '搜索空状态文案'),
('search.violation_text', '搜索内容不支持展示', 'SEARCH', 'TEXT', 1, 'ENABLED', '搜索违规提示文案'),
('search.default_sort', '综合相关度', 'SEARCH', 'TEXT', 1, 'ENABLED', '搜索结果基础排序规则')
ON DUPLICATE KEY UPDATE
config_value = VALUES(config_value),
config_group = VALUES(config_group),
config_type = VALUES(config_type),
public_visible = VALUES(public_visible),
status = VALUES(status),
remark = VALUES(remark);

-- ======================================================
-- 种子数据：移动端入口配置
-- ======================================================
INSERT INTO mobile_entry_config
(page_code, entry_key, entry_name, icon, jump_type, jump_target, badge_text, badge_type, login_required, sort, status)
VALUES
('MY_PAGE', 'help_docs', '帮助文档', 'help', 'NATIVE_ROUTE', '/pages/help/index', NULL, 'NONE', 0, 10, 'ENABLED'),
('MY_PAGE', 'announcements', '平台公告', 'notice', 'NATIVE_ROUTE', '/pages/announcement/index', NULL, 'NONE', 0, 20, 'ENABLED'),
('MY_PAGE', 'about_us', '关于我们', 'info', 'NATIVE_ROUTE', '/pages/about/index', NULL, 'NONE', 0, 30, 'ENABLED'),
('MY_PAGE', 'user_agreement', '用户协议', 'file', 'H5', 'config:agreement.user_agreement', NULL, 'NONE', 0, 40, 'ENABLED'),
('SETTINGS_PAGE', 'privacy_policy', '隐私政策', 'shield', 'H5', 'config:agreement.privacy_policy', NULL, 'NONE', 0, 10, 'ENABLED'),
('SETTINGS_PAGE', 'third_party_list', '第三方信息共享清单', 'list', 'H5', 'config:agreement.third_party_list', NULL, 'NONE', 0, 20, 'ENABLED'),
('SETTINGS_PAGE', 'personal_info_list', '个人信息收集清单', 'list', 'H5', 'config:agreement.personal_info_list', NULL, 'NONE', 0, 30, 'ENABLED'),
('SEARCH_RESULT_TAB', 'user', '用户', NULL, 'NONE', NULL, NULL, 'NONE', 0, 10, 'ENABLED'),
('SEARCH_RESULT_TAB', 'post', '动态', NULL, 'NONE', NULL, NULL, 'NONE', 0, 20, 'ENABLED'),
('SEARCH_RESULT_TAB', 'topic', '话题', NULL, 'NONE', NULL, NULL, 'NONE', 0, 30, 'ENABLED')
ON DUPLICATE KEY UPDATE
entry_name = VALUES(entry_name),
icon = VALUES(icon),
jump_type = VALUES(jump_type),
jump_target = VALUES(jump_target),
sort = VALUES(sort),
status = VALUES(status);

-- ======================================================
-- 种子数据：菜单权限
-- ======================================================
INSERT INTO sys_menu (id, parent_id, menu_name, menu_type, path, component, icon, perms, menu_sort, visible)
VALUES
(800, 0, '运营中心', 'M', NULL, NULL, 'Megaphone', NULL, 80, 1),
(810, 800, '内容文章', 'C', '/content/articles', 'content/ContentArticlePage', 'FileText', 'content:article:list', 1, 1),
(811, 810, '新增文章', 'F', NULL, NULL, NULL, 'content:article:add', 1, 0),
(812, 810, '编辑文章', 'F', NULL, NULL, NULL, 'content:article:edit', 2, 0),
(813, 810, '删除文章', 'F', NULL, NULL, NULL, 'content:article:delete', 3, 0),
(814, 810, '发布下线文章', 'F', NULL, NULL, NULL, 'content:article:publish', 4, 0),
(820, 800, '应用配置', 'C', '/content/app-config', 'content/AppConfigPage', 'Settings', 'content:config:list', 2, 1),
(821, 820, '修改配置', 'F', NULL, NULL, NULL, 'content:config:edit', 1, 0),
(830, 800, '移动端入口', 'C', '/content/mobile-entries', 'content/MobileEntryConfigPage', 'PanelTop', 'content:entry:list', 3, 1),
(831, 830, '新增入口', 'F', NULL, NULL, NULL, 'content:entry:add', 1, 0),
(832, 830, '编辑入口', 'F', NULL, NULL, NULL, 'content:entry:edit', 2, 0),
(833, 830, '删除入口', 'F', NULL, NULL, NULL, 'content:entry:delete', 3, 0),
(840, 800, '搜索热词', 'C', '/content/search-hot-words', 'content/SearchHotWordPage', 'Search', 'content:hotWord:list', 4, 1),
(841, 840, '新增热词', 'F', NULL, NULL, NULL, 'content:hotWord:add', 1, 0),
(842, 840, '编辑热词', 'F', NULL, NULL, NULL, 'content:hotWord:edit', 2, 0),
(843, 840, '删除热词', 'F', NULL, NULL, NULL, 'content:hotWord:delete', 3, 0),
(850, 800, '搜索屏蔽词', 'C', '/content/search-block-words', 'content/SearchBlockWordPage', 'ShieldAlert', 'content:blockWord:list', 5, 1),
(851, 850, '新增屏蔽词', 'F', NULL, NULL, NULL, 'content:blockWord:add', 1, 0),
(852, 850, '编辑屏蔽词', 'F', NULL, NULL, NULL, 'content:blockWord:edit', 2, 0),
(853, 850, '删除屏蔽词', 'F', NULL, NULL, NULL, 'content:blockWord:delete', 3, 0),
(860, 800, '操作日志', 'C', '/content/operation-logs', 'content/ContentOperationLogPage', 'ScrollText', 'content:operationLog:list', 6, 1)
ON DUPLICATE KEY UPDATE
menu_name = VALUES(menu_name),
parent_id = VALUES(parent_id),
menu_type = VALUES(menu_type),
path = VALUES(path),
component = VALUES(component),
icon = VALUES(icon),
perms = VALUES(perms),
menu_sort = VALUES(menu_sort),
visible = VALUES(visible);

-- 为超级管理员角色（id=1）授予所有新菜单权限
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT 1, id FROM sys_menu WHERE id BETWEEN 800 AND 860;
