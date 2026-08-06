-- 回滚 066：撤销后台彻底删除入口和存储过程。
-- 已经被物理删除的用户业务数据不可恢复，回滚前必须确认没有正在执行的删除请求。

DROP PROCEDURE IF EXISTS spacetime_delete_app_user_data;

DELETE role_menu
  FROM sys_role_menu role_menu
  JOIN sys_menu menu ON menu.id = role_menu.menu_id
 WHERE menu.perms = 'user:app:delete';

DELETE FROM sys_menu WHERE perms = 'user:app:delete';

