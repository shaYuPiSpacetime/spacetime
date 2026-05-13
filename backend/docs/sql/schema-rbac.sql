-- =============================================
-- Spacetime RBAC 基础表结构
-- 参照 RuoYi 模式：用户 → 角色 → 菜单权限
-- =============================================

-- 1. 修改 sys_user 表：增加头像字段
ALTER TABLE sys_user ADD COLUMN avatar VARCHAR(500) DEFAULT NULL COMMENT '头像URL';

-- 2. 系统角色表
DROP TABLE IF EXISTS sys_role;
CREATE TABLE sys_role (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    role_name   VARCHAR(50)  NOT NULL COMMENT '角色名称',
    role_code   VARCHAR(50)  NOT NULL COMMENT '角色编码',
    role_group  VARCHAR(50)  DEFAULT 'DEFAULT' COMMENT '角色分组',
    role_sort   INT          DEFAULT 0 COMMENT '排序号',
    status      VARCHAR(20)  DEFAULT 'ENABLED' COMMENT '状态: ENABLED/DISABLED',
    remark      VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by  BIGINT       DEFAULT NULL,
    updated_by  BIGINT       DEFAULT NULL,
    deleted     TINYINT      DEFAULT 0 COMMENT '逻辑删除: 0=正常, 1=已删除',
    UNIQUE KEY uk_role_code (role_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统角色表';

-- 3. 系统菜单/权限表
DROP TABLE IF EXISTS sys_menu;
CREATE TABLE sys_menu (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    parent_id   BIGINT       DEFAULT 0 COMMENT '父菜单ID, 0=根节点',
    menu_name   VARCHAR(50)  NOT NULL COMMENT '菜单名称',
    menu_type   CHAR(1)      NOT NULL COMMENT '菜单类型: M=目录, C=菜单, F=按钮',
    path        VARCHAR(200) DEFAULT NULL COMMENT '路由路径 (C有效)',
    component   VARCHAR(200) DEFAULT NULL COMMENT '前端组件路径 (C有效)',
    icon        VARCHAR(100) DEFAULT NULL COMMENT 'Lucide 图标名称',
    perms       VARCHAR(200) DEFAULT NULL COMMENT '权限标识, 如 system:user:list',
    menu_sort   INT          DEFAULT 0 COMMENT '排序号',
    status      VARCHAR(20)  DEFAULT 'ENABLED' COMMENT '状态: ENABLED/DISABLED',
    visible     TINYINT      DEFAULT 1 COMMENT '是否可见: 0=隐藏, 1=显示',
    remark      VARCHAR(500) DEFAULT NULL COMMENT '备注',
    create_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by  BIGINT       DEFAULT NULL,
    updated_by  BIGINT       DEFAULT NULL,
    deleted     TINYINT      DEFAULT 0 COMMENT '逻辑删除: 0=正常, 1=已删除'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统菜单/权限表';

-- 4. 角色-菜单关联表
DROP TABLE IF EXISTS sys_role_menu;
CREATE TABLE sys_role_menu (
    id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT NOT NULL COMMENT '角色ID',
    menu_id BIGINT NOT NULL COMMENT '菜单ID',
    UNIQUE KEY uk_role_menu (role_id, menu_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色-菜单关联表';

-- 5. 用户-角色关联表
DROP TABLE IF EXISTS sys_user_role;
CREATE TABLE sys_user_role (
    id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    role_id BIGINT NOT NULL COMMENT '角色ID',
    UNIQUE KEY uk_user_role (user_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户-角色关联表';

-- =============================================
-- 种子数据
-- =============================================

-- 超级管理员角色
INSERT INTO sys_role (id, role_name, role_code, role_group, role_sort, status) VALUES
(1, '超级管理员', 'super_admin', 'DEFAULT', 1, 'ENABLED');

-- 系统管理菜单树
INSERT INTO sys_menu (id, parent_id, menu_name, menu_type, path, component, icon, perms, menu_sort, visible) VALUES
-- 系统管理目录
(1,  0,  '系统管理', 'M', NULL,    NULL,              'Settings', NULL,                1, 1),
-- 用户管理
(2,  1,  '用户管理', 'C', '/system/user', 'system/UserManagement', 'Users',    'system:user:list',   1, 1),
(3,  2,  '新增用户', 'F', NULL,    NULL,              NULL,       'system:user:add',    1, 0),
(4,  2,  '编辑用户', 'F', NULL,    NULL,              NULL,       'system:user:edit',   2, 0),
(5,  2,  '删除用户', 'F', NULL,    NULL,              NULL,       'system:user:delete', 3, 0),
-- 角色管理
(6,  1,  '角色管理', 'C', '/system/role', 'system/RoleManagement', 'Shield',   'system:role:list',   2, 1),
(7,  6,  '新增角色', 'F', NULL,    NULL,              NULL,       'system:role:add',    1, 0),
(8,  6,  '编辑角色', 'F', NULL,    NULL,              NULL,       'system:role:edit',   2, 0),
(9,  6,  '删除角色', 'F', NULL,    NULL,              NULL,       'system:role:delete', 3, 0),
-- 菜单管理
(10, 1,  '菜单管理', 'C', '/system/menu', 'system/MenuManagement', 'Menu',     'system:menu:list',   3, 1),
(11, 10, '新增菜单', 'F', NULL,    NULL,              NULL,       'system:menu:add',    1, 0),
(12, 10, '编辑菜单', 'F', NULL,    NULL,              NULL,       'system:menu:edit',   2, 0),
(13, 10, '删除菜单', 'F', NULL,    NULL,              NULL,       'system:menu:delete', 3, 0);

-- 超级管理员拥有所有菜单权限
INSERT INTO sys_role_menu (role_id, menu_id)
SELECT 1, id FROM sys_menu;
