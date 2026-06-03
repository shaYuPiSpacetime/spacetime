-- =============================================
-- PRD-01 管理后台权限补充：认证审核 + 内容审核
-- peter 用户需要这些权限才能访问 verify 和 moderation 接口
-- 执行方式: 在 MySQL 客户端中 source 此文件
-- =============================================
-- 日期: 2026-06-03

-- 1. 在 sys_menu 中添加缺失的权限菜单项
-- 认证审核菜单
INSERT IGNORE INTO sys_menu (menu_name, perms, menu_type, menu_sort, parent_id, path, status, visible, create_time, update_time)
VALUES
('实名认证审核列表', 'verify:realname:list', 'BUTTON', 1, NULL, '', 'ENABLED', 1, NOW(), NOW()),
('学历认证审核列表', 'verify:education:list', 'BUTTON', 2, NULL, '', 'ENABLED', 1, NOW(), NOW()),
('头像认证审核列表', 'verify:avatar:list', 'BUTTON', 3, NULL, '', 'ENABLED', 1, NOW(), NOW()),
('实名认证审核操作', 'verify:realname:audit', 'BUTTON', 4, NULL, '', 'ENABLED', 1, NOW(), NOW()),
('学历认证审核操作', 'verify:education:audit', 'BUTTON', 5, NULL, '', 'ENABLED', 1, NOW(), NOW()),
('头像认证审核操作', 'verify:avatar:audit', 'BUTTON', 6, NULL, '', 'ENABLED', 1, NOW(), NOW()),

-- 内容审核菜单
('资料照片审核列表', 'moderation:photo:list', 'BUTTON', 7, NULL, '', 'ENABLED', 1, NOW(), NOW()),
('文字内容审核列表', 'moderation:text:list', 'BUTTON', 8, NULL, '', 'ENABLED', 1, NOW(), NOW()),
('资料照片审核操作', 'moderation:photo:audit', 'BUTTON', 9, NULL, '', 'ENABLED', 1, NOW(), NOW()),
('文字内容审核操作', 'moderation:text:audit', 'BUTTON', 10, NULL, '', 'ENABLED', 1, NOW(), NOW());

-- 2. 将新权限授予 peter 的角色
-- 查询 peter 的角色ID:
-- SELECT r.id FROM sys_role r
--   JOIN sys_user_role ur ON r.id = ur.role_id
--   JOIN sys_user u ON ur.user_id = u.id
--   WHERE u.username = 'peter';

-- 假设 peter 的角色ID为 admin 角色，通常 id=1
-- 将新菜单关联到 admin 角色
INSERT IGNORE INTO sys_role_menu (role_id, menu_id, create_time, update_time)
SELECT 1, id, NOW(), NOW() FROM sys_menu WHERE perms IN (
    'verify:realname:list', 'verify:education:list', 'verify:avatar:list',
    'verify:realname:audit', 'verify:education:audit', 'verify:avatar:audit',
    'moderation:photo:list', 'moderation:text:list',
    'moderation:photo:audit', 'moderation:text:audit'
);
