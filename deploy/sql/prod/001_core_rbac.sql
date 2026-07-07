-- ======================================================
-- 生产核心 RBAC 安全迁移
-- 仅创建缺失表和幂等种子数据，禁止破坏性 DDL。
-- ======================================================

CREATE TABLE IF NOT EXISTS sys_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    password VARCHAR(100) NOT NULL COMMENT 'BCrypt 密码',
    nickname VARCHAR(50) DEFAULT NULL COMMENT '昵称',
    email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
    phone VARCHAR(30) DEFAULT NULL COMMENT '手机号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态',
    avatar VARCHAR(500) DEFAULT NULL COMMENT '头像 URL',
    last_login_time DATETIME DEFAULT NULL COMMENT '最后登录时间',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    UNIQUE KEY uk_sys_user_username (username),
    UNIQUE KEY uk_sys_user_phone (phone),
    INDEX idx_sys_user_status (status, deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户表';

SET @has_avatar := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sys_user'
      AND COLUMN_NAME = 'avatar'
);
SET @sql := IF(@has_avatar = 0,
    'ALTER TABLE sys_user ADD COLUMN avatar VARCHAR(500) DEFAULT NULL COMMENT ''头像 URL''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_last_login_time := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sys_user'
      AND COLUMN_NAME = 'last_login_time'
);
SET @sql := IF(@has_last_login_time = 0,
    'ALTER TABLE sys_user ADD COLUMN last_login_time DATETIME DEFAULT NULL COMMENT ''最后登录时间''',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS sys_role (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL COMMENT '角色名称',
    role_code VARCHAR(50) NOT NULL COMMENT '角色编码',
    role_group VARCHAR(50) DEFAULT 'DEFAULT' COMMENT '角色分组',
    role_sort INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    UNIQUE KEY uk_sys_role_code (role_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统角色表';

CREATE TABLE IF NOT EXISTS sys_menu (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    parent_id BIGINT DEFAULT 0 COMMENT '父菜单 ID',
    menu_name VARCHAR(50) NOT NULL COMMENT '菜单名称',
    menu_type CHAR(1) NOT NULL COMMENT '菜单类型：M=目录，C=菜单，F=按钮',
    path VARCHAR(200) DEFAULT NULL COMMENT '路由路径',
    component VARCHAR(200) DEFAULT NULL COMMENT '前端组件路径',
    icon VARCHAR(100) DEFAULT NULL COMMENT '图标',
    perms VARCHAR(200) DEFAULT NULL COMMENT '权限标识',
    menu_sort INT DEFAULT 0 COMMENT '排序号',
    status VARCHAR(20) DEFAULT 'ENABLED' COMMENT '状态',
    visible TINYINT DEFAULT 1 COMMENT '是否可见：0=隐藏，1=显示',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT DEFAULT NULL,
    updated_by BIGINT DEFAULT NULL,
    deleted TINYINT DEFAULT 0 COMMENT '逻辑删除：0=正常，1=已删除',
    INDEX idx_sys_menu_parent (parent_id, deleted),
    INDEX idx_sys_menu_perms (perms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统菜单权限表';

CREATE TABLE IF NOT EXISTS sys_role_menu (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT NOT NULL COMMENT '角色 ID',
    menu_id BIGINT NOT NULL COMMENT '菜单 ID',
    UNIQUE KEY uk_sys_role_menu (role_id, menu_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色菜单关联表';

CREATE TABLE IF NOT EXISTS sys_user_role (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户 ID',
    role_id BIGINT NOT NULL COMMENT '角色 ID',
    UNIQUE KEY uk_sys_user_role (user_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';

INSERT INTO sys_role (id, role_name, role_code, role_group, role_sort, status)
VALUES (1, '超级管理员', 'super_admin', 'DEFAULT', 1, 'ENABLED')
ON DUPLICATE KEY UPDATE
    role_name = VALUES(role_name),
    role_code = VALUES(role_code),
    role_group = VALUES(role_group),
    role_sort = VALUES(role_sort),
    status = VALUES(status),
    update_time = CURRENT_TIMESTAMP,
    deleted = 0;

INSERT INTO sys_menu (id, parent_id, menu_name, menu_type, path, component, icon, perms, menu_sort, status, visible)
VALUES
(1, 0, '系统管理', 'M', NULL, NULL, 'Settings', NULL, 1, 'ENABLED', 1),
(2, 1, '用户管理', 'C', '/system/user', 'system/UserManagement', 'Users', 'system:user:list', 1, 'ENABLED', 1),
(3, 2, '新增用户', 'F', NULL, NULL, NULL, 'system:user:add', 1, 'ENABLED', 0),
(4, 2, '编辑用户', 'F', NULL, NULL, NULL, 'system:user:edit', 2, 'ENABLED', 0),
(5, 2, '删除用户', 'F', NULL, NULL, NULL, 'system:user:delete', 3, 'ENABLED', 0),
(6, 1, '角色管理', 'C', '/system/role', 'system/RoleManagement', 'Shield', 'system:role:list', 2, 'ENABLED', 1),
(7, 6, '新增角色', 'F', NULL, NULL, NULL, 'system:role:add', 1, 'ENABLED', 0),
(8, 6, '编辑角色', 'F', NULL, NULL, NULL, 'system:role:edit', 2, 'ENABLED', 0),
(9, 6, '删除角色', 'F', NULL, NULL, NULL, 'system:role:delete', 3, 'ENABLED', 0),
(10, 1, '菜单管理', 'C', '/system/menu', 'system/MenuManagement', 'Menu', 'system:menu:list', 3, 'ENABLED', 1),
(11, 10, '新增菜单', 'F', NULL, NULL, NULL, 'system:menu:add', 1, 'ENABLED', 0),
(12, 10, '编辑菜单', 'F', NULL, NULL, NULL, 'system:menu:edit', 2, 'ENABLED', 0),
(13, 10, '删除菜单', 'F', NULL, NULL, NULL, 'system:menu:delete', 3, 'ENABLED', 0),
(14, 1, '字典管理', 'M', NULL, NULL, 'BookOpen', NULL, 4, 'ENABLED', 1),
(15, 14, '字典类型', 'C', '/system/dict-type', 'system/DictTypeManagement', 'List', 'system:dict:list', 1, 'ENABLED', 1),
(16, 14, '字典数据', 'C', '/system/dict-data', 'system/DictDataManagement', 'Database', 'system:dict:list', 2, 'ENABLED', 1),
(17, 14, '新增字典', 'F', NULL, NULL, NULL, 'system:dict:add', 1, 'ENABLED', 0),
(18, 14, '编辑字典', 'F', NULL, NULL, NULL, 'system:dict:edit', 2, 'ENABLED', 0),
(19, 14, '删除字典', 'F', NULL, NULL, NULL, 'system:dict:delete', 3, 'ENABLED', 0)
ON DUPLICATE KEY UPDATE
    parent_id = VALUES(parent_id),
    menu_name = VALUES(menu_name),
    menu_type = VALUES(menu_type),
    path = VALUES(path),
    component = VALUES(component),
    icon = VALUES(icon),
    perms = VALUES(perms),
    menu_sort = VALUES(menu_sort),
    status = VALUES(status),
    visible = VALUES(visible),
    update_time = CURRENT_TIMESTAMP,
    deleted = 0;

INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT 1, id FROM sys_menu WHERE id BETWEEN 1 AND 19;
