-- 后台赠送台账；不补发历史资产，不创建支付订单。
CREATE TABLE IF NOT EXISTS app_user_asset_grant (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  idempotency_key VARCHAR(160) NOT NULL,
  source VARCHAR(40) NOT NULL,
  vip_days INT NOT NULL DEFAULT 0,
  coin_amount INT NOT NULL DEFAULT 0,
  balance_before INT NOT NULL,
  balance_after INT NOT NULL,
  vip_expire_before DATETIME NULL,
  vip_expire_after DATETIME NULL,
  reason VARCHAR(200) NOT NULL,
  operator_id BIGINT NULL,
  operator_name VARCHAR(100) NULL,
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL,
  updated_by BIGINT NULL,
  deleted TINYINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_asset_grant_key (idempotency_key),
  KEY idx_asset_grant_user (user_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员和千寻币赠送台账';

-- 回退时停用新功能并回退应用，保留台账，禁止删除已发放资产或流水。

-- 新权限仅默认授予超级管理员；普通运营由角色管理明确授权。
INSERT INTO sys_menu (parent_id, menu_name, menu_type, perms, menu_sort, visible, status, remark)
SELECT parent.id, '赠送会员与千寻币', 'F', 'commercial:user:grant', 99, 0, 'ENABLED', '直接发放用户资产，需填写原因并记录流水'
FROM sys_menu parent
WHERE parent.perms = 'user:app:list' AND parent.menu_type = 'C' AND parent.deleted = 0
AND NOT EXISTS (SELECT 1 FROM sys_menu existing WHERE existing.perms = 'commercial:user:grant' AND existing.deleted = 0)
LIMIT 1;

INSERT INTO sys_role_menu (role_id, menu_id)
SELECT role_item.id, menu_item.id FROM sys_role role_item JOIN sys_menu menu_item ON menu_item.perms = 'commercial:user:grant'
WHERE role_item.role_code = 'super_admin' AND role_item.deleted = 0 AND role_item.status = 'ENABLED' AND menu_item.deleted = 0
AND NOT EXISTS (SELECT 1 FROM sys_role_menu existing WHERE existing.role_id = role_item.id AND existing.menu_id = menu_item.id);
