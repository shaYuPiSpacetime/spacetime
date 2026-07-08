-- ======================================================
-- PRD-01 准入配置页权限种子
-- 说明：补齐 /access/config 菜单与 /admin/prd01/config 接口权限，避免真实账号联调 403。
-- ======================================================

INSERT INTO sys_menu (parent_id, menu_name, menu_type, path, component, icon, perms, menu_sort, visible, status, remark)
SELECT m.parent_id, '准入配置', 'C', '/access/config', 'access/AccessConfigPage', 'Settings', 'access:config:list', 7, 1, 'ENABLED', 'PRD-01 准入配置页'
FROM sys_menu m
WHERE m.perms = 'user:app:list'
  AND m.menu_type = 'C'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'access:config:list' AND menu_type = 'C');

INSERT INTO sys_menu (parent_id, menu_name, menu_type, perms, menu_sort, visible, status, remark)
SELECT m.id, '保存准入配置', 'F', 'access:config:edit', 1, 0, 'ENABLED', 'PRD-01 准入配置保存权限'
FROM sys_menu m
WHERE m.perms = 'access:config:list'
  AND m.menu_type = 'C'
  AND NOT EXISTS (SELECT 1 FROM sys_menu WHERE perms = 'access:config:edit' AND menu_type = 'F');

INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT 1, id
FROM sys_menu
WHERE perms IN ('access:config:list', 'access:config:edit');
