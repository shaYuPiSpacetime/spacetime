-- ======================================================
-- PRD-04 商业化 Demo 菜单对齐
-- 适用：当前唯一数据库，本脚本幂等执行。
-- 目标：左侧菜单与静态 Demo 保持一致：
--       移动端配置 / 商业化配置
--       财务中心 / 商业化订单、资产流水、退款记录、轻量对账
-- ======================================================

INSERT INTO sys_menu (id, parent_id, menu_name, menu_type, path, component, icon, perms, menu_sort, status, visible, remark)
VALUES
(800, 0, '财务中心', 'M', NULL, NULL, 'DollarSign', NULL, 80, 'ENABLED', 1, 'ADM-04 财务中心父菜单'),
(810, 0, '移动端配置', 'M', NULL, NULL, 'Settings', NULL, 81, 'ENABLED', 1, 'ADM-04 移动端配置父菜单'),
(821, 810, '商业化配置', 'C', '/commercial/config', 'commercial/CommercialManagement', NULL, 'commercial:config:view', 1, 'ENABLED', 1, '移动端配置 / 商业化配置'),
(822, 821, '保存商业化配置', 'F', NULL, NULL, NULL, 'commercial:config:edit', 1, 'ENABLED', 0, '商业化配置保存按钮权限'),
(823, 800, '商业化订单', 'C', '/commercial/orders', 'commercial/CommercialManagement', NULL, 'finance:order:list', 1, 'ENABLED', 1, '财务中心 / 商业化订单'),
(824, 800, '资产流水', 'C', '/commercial/flows', 'commercial/CommercialManagement', NULL, 'finance:flow:list', 2, 'ENABLED', 1, '财务中心 / 资产流水'),
(825, 800, '退款记录', 'C', '/commercial/refunds', 'commercial/CommercialManagement', NULL, 'finance:refund:list', 3, 'ENABLED', 1, '财务中心 / 退款记录'),
(826, 800, '轻量对账', 'C', '/commercial/reconcile', 'commercial/CommercialManagement', NULL, 'finance:stats:view', 4, 'ENABLED', 1, '财务中心 / 轻量对账'),
(827, 821, '用户商业化详情', 'F', NULL, NULL, NULL, 'commercial:user:view', 6, 'ENABLED', 0, '用户详情商业化资产权限'),
(828, 823, '发起退款', 'F', NULL, NULL, NULL, 'finance:refund:process', 7, 'ENABLED', 0, '订单详情发起退款按钮权限')
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
    remark = VALUES(remark),
    deleted = 0,
    update_time = CURRENT_TIMESTAMP;

-- 当前库中 820 已被内容管理占用，若误隐藏则恢复。
UPDATE sys_menu
SET visible = 1,
    update_time = CURRENT_TIMESTAMP
WHERE deleted = 0
  AND id = 820
  AND path = '/content/app-config';

-- 隐藏历史独立入口，但保留权限记录。
UPDATE sys_menu
SET visible = 0,
    update_time = CURRENT_TIMESTAMP
WHERE deleted = 0
  AND menu_name = CONCAT('商业化', '中心');

-- 统一旧隐藏配置项的展示名称。
UPDATE sys_menu
SET menu_name = '千寻币套餐配置',
    update_time = CURRENT_TIMESTAMP
WHERE deleted = 0
  AND id = 817
  AND menu_name = CONCAT('成', '家币套餐配置');

-- 隐藏旧 VIP / 千寻币独立配置入口，避免与 Demo 菜单重复。
UPDATE sys_menu
SET visible = 0,
    update_time = CURRENT_TIMESTAMP
WHERE deleted = 0
  AND (
      path IN ('/config/vip-benefits', '/config/vip-packages', '/config/coin-packages', '/finance/orders', '/finance/flows', '/finance/refunds')
      OR id IN (801, 802, 803, 804, 805, 811, 812, 813, 814, 815, 816, 817, 818, 819)
  );

-- 若历史环境存在同 path 重复菜单，只保留本脚本固定 ID 可见。
UPDATE sys_menu
SET visible = 0,
    update_time = CURRENT_TIMESTAMP
WHERE deleted = 0
  AND path IN ('/commercial/config', '/commercial/orders', '/commercial/flows', '/commercial/refunds', '/commercial/reconcile')
  AND id NOT IN (821, 823, 824, 825, 826);

-- 超级管理员绑定本轮菜单与按钮权限。
INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT 1, id
FROM sys_menu
WHERE id IN (800, 810, 821, 822, 823, 824, 825, 826, 827, 828);
