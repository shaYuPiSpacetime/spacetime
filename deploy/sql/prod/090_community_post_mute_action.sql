-- =============================================================
-- 动态作者禁言闭环
-- 说明：补齐内容/动态操作字典与独立高风险权限；脚本可重复执行。
-- =============================================================

UPDATE sys_dict_data
   SET dict_label = '禁言用户',
       dict_sort = 5,
       status = 'ENABLED',
       remark = '内容或动态作者禁言',
       update_time = CURRENT_TIMESTAMP,
       deleted = 0
 WHERE dict_type = 'community_post_action'
   AND dict_value = 'mute_user';

INSERT INTO sys_dict_data (
    dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark,
    create_time, update_time, deleted
)
SELECT 'community_post_action', 0, '禁言用户', 'mute_user', 5, 'ENABLED',
       '内容或动态作者禁言', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (
    SELECT 1
      FROM sys_dict_data existing
     WHERE existing.dict_type = 'community_post_action'
       AND existing.dict_value = 'mute_user'
       AND existing.deleted = 0
);

-- 父菜单也按稳定权限编码定位，避免不同环境的 AUTO_INCREMENT 编号漂移。
UPDATE sys_menu child
JOIN sys_menu parent
  ON parent.id = child.parent_id
 AND parent.perms = 'community:content:list'
 AND parent.menu_type = 'C'
 AND parent.deleted = 0
   SET child.menu_name = '内容作者禁言', child.menu_type = 'F', child.menu_sort = 4,
       child.visible = 0, child.status = 'ENABLED', child.remark = '内容作者禁言，仅风控或超管',
       child.update_time = CURRENT_TIMESTAMP, child.deleted = 0
 WHERE child.perms = 'community:post:risk';

INSERT INTO sys_menu (
    parent_id, menu_name, menu_type, path, component, icon,
    perms, menu_sort, visible, status, remark
)
SELECT parent.id, '内容作者禁言', 'F', NULL, NULL, NULL,
       'community:post:risk', 4, 0, 'ENABLED', '内容作者禁言，仅风控或超管'
  FROM sys_menu parent
 WHERE parent.perms = 'community:content:list'
   AND parent.menu_type = 'C'
   AND parent.status = 'ENABLED'
   AND parent.deleted = 0
   AND NOT EXISTS (
    SELECT 1 FROM sys_menu
     WHERE parent_id = parent.id AND perms = 'community:post:risk' AND deleted = 0
   );

UPDATE sys_menu child
JOIN sys_menu parent
  ON parent.id = child.parent_id
 AND parent.perms = 'community:moments:list'
 AND parent.menu_type = 'C'
 AND parent.deleted = 0
   SET child.menu_name = '动态作者禁言', child.menu_type = 'F', child.menu_sort = 4,
       child.visible = 0, child.status = 'ENABLED', child.remark = '动态作者禁言，仅风控或超管',
       child.update_time = CURRENT_TIMESTAMP, child.deleted = 0
 WHERE child.perms = 'community:post:risk';

INSERT INTO sys_menu (
    parent_id, menu_name, menu_type, path, component, icon,
    perms, menu_sort, visible, status, remark
)
SELECT parent.id, '动态作者禁言', 'F', NULL, NULL, NULL,
       'community:post:risk', 4, 0, 'ENABLED', '动态作者禁言，仅风控或超管'
  FROM sys_menu parent
 WHERE parent.perms = 'community:moments:list'
   AND parent.menu_type = 'C'
   AND parent.status = 'ENABLED'
   AND parent.deleted = 0
   AND NOT EXISTS (
    SELECT 1 FROM sys_menu
     WHERE parent_id = parent.id AND perms = 'community:post:risk' AND deleted = 0
   );

INSERT INTO sys_role_menu (role_id, menu_id)
SELECT role.id, menu.id
  FROM sys_role role
  JOIN sys_menu menu
    ON menu.perms = 'community:post:risk'
   AND menu.deleted = 0
  JOIN sys_menu parent
    ON parent.id = menu.parent_id
   AND parent.perms IN ('community:content:list', 'community:moments:list')
   AND parent.menu_type = 'C'
   AND parent.deleted = 0
 WHERE role.role_code = 'super_admin'
   AND role.deleted = 0
   AND NOT EXISTS (
       SELECT 1
         FROM sys_role_menu granted
        WHERE granted.role_id = role.id
          AND granted.menu_id = menu.id
   );
