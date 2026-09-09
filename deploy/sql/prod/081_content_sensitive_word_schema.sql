-- 敏感词管理：结构与运营中心下的敏感词菜单；词条初始化另见 082。
-- 新词条表不包含记录版本号、来源字段或辅助生成列。
CREATE TABLE IF NOT EXISTS content_sensitive_word (
    id BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    category_code VARCHAR(64) NOT NULL COMMENT '附件固定单选分类',
    word VARCHAR(256) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL COMMENT '敏感词原文',
    status VARCHAR(20) NOT NULL DEFAULT 'ENABLED' COMMENT 'ENABLED启用，DISABLED停用',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_sensitive_word_word_deleted (word, deleted),
    KEY idx_sensitive_word_category_status (category_code, status, deleted),
    KEY idx_sensitive_word_status_deleted (status, deleted),
    CONSTRAINT chk_sensitive_word_status CHECK (status IN ('ENABLED', 'DISABLED')),
    CONSTRAINT chk_sensitive_word_deleted CHECK (deleted IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容敏感词';

CREATE TABLE IF NOT EXISTS content_sensitive_word_revision (
    id BIGINT NOT NULL COMMENT '固定单行ID为1',
    revision BIGINT NOT NULL DEFAULT 1 COMMENT '词库全局刷新标记',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT chk_sensitive_revision_id CHECK (id = 1),
    CONSTRAINT chk_sensitive_revision_value CHECK (revision >= 1),
    CONSTRAINT chk_sensitive_revision_deleted CHECK (deleted = 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感词全局刷新标记';

START TRANSACTION;
INSERT INTO content_sensitive_word_revision (id, revision) VALUES (1, 1)
ON DUPLICATE KEY UPDATE id = id;

-- 复用既有运营中心；空环境单独执行本脚本时补齐目录。
INSERT INTO sys_menu
(parent_id, menu_name, menu_type, icon, menu_sort, visible, status, remark, create_time, update_time, deleted)
SELECT 0, '运营中心', 'M', 'Megaphone', 83, 1, 'ENABLED', '一期运营中心父菜单',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (
    SELECT 1 FROM sys_menu WHERE parent_id=0 AND menu_name='运营中心' AND menu_type='M' AND deleted=0
);

INSERT INTO sys_menu
(parent_id, menu_name, menu_type, path, component, icon, perms, menu_sort, visible, status, remark, create_time, update_time, deleted)
SELECT parent.id, '敏感词管理', 'C', '/sensitive-words', 'sensitive-word/SensitiveWordManagement',
       'ShieldAlert', 'sensitive-word:list', 10, 1, 'ENABLED', '供各模块文字审核共用的敏感词维护',
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
FROM sys_menu parent
WHERE parent.parent_id=0 AND parent.menu_name='运营中心' AND parent.menu_type='M' AND parent.deleted=0
AND NOT EXISTS (
    SELECT 1 FROM sys_menu WHERE deleted = 0 AND (path = '/sensitive-words' OR perms = 'sensitive-word:list')
);

-- 已有独立一级入口原位移动，保留菜单ID、路由及所有按钮/角色关联。
UPDATE sys_menu page
JOIN sys_menu parent ON parent.parent_id=0 AND parent.menu_name='运营中心'
    AND parent.menu_type='M' AND parent.deleted=0
SET page.parent_id=parent.id, page.menu_sort=10, page.update_time=CURRENT_TIMESTAMP
WHERE page.path='/sensitive-words' AND page.perms='sensitive-word:list' AND page.deleted=0
    AND (page.parent_id<>parent.id OR page.menu_sort<>10);

INSERT INTO sys_menu
(parent_id, menu_name, menu_type, perms, menu_sort, visible, status, remark, create_time, update_time, deleted)
SELECT page.id, seed.menu_name, 'F', seed.perms, seed.menu_sort, 0, 'ENABLED',
       '敏感词维护操作', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
FROM sys_menu page
JOIN (
    SELECT '新增敏感词' AS menu_name, 'sensitive-word:add' AS perms, 1 AS menu_sort
    UNION ALL SELECT '编辑敏感词', 'sensitive-word:edit', 2
    UNION ALL SELECT '删除敏感词', 'sensitive-word:delete', 3
) seed
WHERE page.perms = 'sensitive-word:list' AND page.deleted = 0
AND NOT EXISTS (
    SELECT 1 FROM sys_menu existing_permission
    WHERE existing_permission.perms = seed.perms AND existing_permission.deleted = 0
);

INSERT INTO sys_role_menu (role_id, menu_id)
SELECT role.id, menu.id
FROM sys_role role
JOIN sys_menu menu ON menu.perms IN ('sensitive-word:list','sensitive-word:add','sensitive-word:edit','sensitive-word:delete')
    AND menu.deleted = 0
WHERE role.role_code = 'super_admin' AND role.status = 'ENABLED' AND role.deleted = 0
AND NOT EXISTS (SELECT 1 FROM sys_role_menu existing_role_menu WHERE existing_role_menu.role_id = role.id AND existing_role_menu.menu_id = menu.id);
-- 仅为已拥有该页面的有效角色补齐无业务权限的父目录，避免移动后路由树缺少祖先。
INSERT INTO sys_role_menu (role_id, menu_id)
SELECT DISTINCT grant_page.role_id, parent.id
FROM sys_role_menu grant_page
JOIN sys_role role ON role.id=grant_page.role_id AND role.deleted=0
JOIN sys_menu page ON page.id=grant_page.menu_id AND page.perms='sensitive-word:list' AND page.deleted=0
JOIN sys_menu parent ON parent.id=page.parent_id AND parent.menu_type='M' AND parent.menu_name='运营中心' AND parent.deleted=0
WHERE NOT EXISTS (
    SELECT 1 FROM sys_role_menu existing_grant WHERE existing_grant.role_id=grant_page.role_id AND existing_grant.menu_id=parent.id
);
COMMIT;
