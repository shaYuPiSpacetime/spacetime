-- 已拥有官网活动管理权限的角色补齐父菜单授权，确保侧栏显示入口；重复执行安全。
INSERT INTO sys_role_menu(role_id,menu_id)
SELECT DISTINCT grant_item.role_id,parent.id
FROM sys_menu parent
JOIN sys_menu child ON child.parent_id=parent.id
  AND child.perms='website:activity:list' AND child.deleted=0 AND child.status='ENABLED'
JOIN sys_role_menu grant_item ON grant_item.menu_id=child.id
JOIN sys_role role_item ON role_item.id=grant_item.role_id
  AND role_item.deleted=0 AND role_item.status='ENABLED'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_role_menu existing
    WHERE existing.role_id=grant_item.role_id AND existing.menu_id=parent.id
  )
  AND parent.parent_id=0 AND parent.menu_name='官网活动'
  AND parent.deleted=0 AND parent.status='ENABLED';
