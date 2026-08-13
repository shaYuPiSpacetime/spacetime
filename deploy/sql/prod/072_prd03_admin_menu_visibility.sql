-- PRD-03 管理后台两个遗漏页面菜单修复。
-- 仅调整菜单形态、父子关系和已有角色授权；不修改消息业务数据。

INSERT INTO `sys_menu`
(`parent_id`, `menu_name`, `menu_type`, `path`, `component`, `icon`, `perms`,
 `menu_sort`, `visible`, `status`, `remark`, `create_time`, `update_time`)
SELECT 0, '运营中心', 'M', NULL, NULL, 'Megaphone', NULL,
       83, 1, 'ENABLED', '一期运营中心父菜单', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM `sys_menu`
     WHERE parent_id=0 AND menu_name='运营中心' AND menu_type='M' AND deleted=0
);

UPDATE `sys_menu`
SET visible=1, status='ENABLED', deleted=0, update_time=CURRENT_TIMESTAMP
WHERE parent_id=0 AND menu_name='运营中心' AND menu_type='M';

UPDATE `sys_menu`
SET menu_name='移动端配置管理', visible=1, status='ENABLED', deleted=0,
    update_time=CURRENT_TIMESTAMP
WHERE id=810 AND menu_type='M';

UPDATE `sys_menu` page
JOIN `sys_menu` parent
  ON parent.parent_id=0 AND parent.menu_name='运营中心'
 AND parent.menu_type='M' AND parent.deleted=0
SET page.parent_id=parent.id,
    page.menu_name='消息通知记录查询',
    page.menu_type='C',
    page.path='/operation/message-records',
    page.component='message/MessageRecordPage',
    page.icon='ScrollText',
    page.menu_sort=5,
    page.visible=1,
    page.status='ENABLED',
    page.remark='运营中心独立消息记录查询页面；正文按消息类型分级展示',
    page.deleted=0,
    page.update_time=CURRENT_TIMESTAMP
WHERE page.perms='message:record:list' AND page.deleted=0;

UPDATE `sys_menu` page
JOIN `sys_menu` parent ON parent.id=810 AND parent.menu_type='M' AND parent.deleted=0
SET page.parent_id=parent.id,
    page.menu_name='社交权限与消息配置',
    page.menu_type='C',
    page.path='/mobile-config/message-social',
    page.component='message/MessageConfigPage',
    page.icon='MessageSquareLock',
    page.menu_sort=8,
    page.visible=1,
    page.status='ENABLED',
    page.remark='移动端配置管理独立页面；仅展示一期已实现配置项',
    page.deleted=0,
    page.update_time=CURRENT_TIMESTAMP
WHERE page.perms='message:config:view' AND page.deleted=0;

UPDATE `sys_menu` action_menu
JOIN `sys_menu` page
  ON page.perms='message:record:list' AND page.menu_type='C' AND page.deleted=0
SET action_menu.parent_id=page.id, action_menu.update_time=CURRENT_TIMESTAMP
WHERE action_menu.perms IN ('message:record:export','message:sensitive-content:view')
  AND action_menu.deleted=0;

UPDATE `sys_menu` action_menu
JOIN `sys_menu` page
  ON page.perms='message:config:view' AND page.menu_type='C' AND page.deleted=0
SET action_menu.parent_id=page.id, action_menu.update_time=CURRENT_TIMESTAMP
WHERE action_menu.perms='message:config:edit' AND action_menu.deleted=0;

-- 已经拥有页面权限的角色同时获得对应父目录，避免路由树因缺少祖先而隐藏页面。
INSERT IGNORE INTO `sys_role_menu` (`role_id`, `menu_id`)
SELECT DISTINCT role_page.role_id, parent.id
FROM `sys_role_menu` role_page
JOIN `sys_menu` page
  ON page.id=role_page.menu_id
 AND page.perms IN ('message:record:list','message:config:view')
 AND page.deleted=0
JOIN `sys_menu` parent ON parent.id=page.parent_id AND parent.deleted=0;
