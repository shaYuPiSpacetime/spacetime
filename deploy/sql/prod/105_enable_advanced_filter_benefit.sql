-- ======================================================
-- 启用「精准筛选功能」会员权益
-- 背景：app_vip_benefit.advanced_filter 状态为 DISABLED，
--       导致会员用户在偏好设置中 vipEffective=false，
--       身高/体重滑块被禁用（前端 disabled 表现）。
-- 修复：将该权益置为 ENABLED，恢复会员高级筛选能力。
-- 幂等：仅当状态不是 ENABLED 时才更新。
-- ======================================================

SET NAMES utf8mb4;

UPDATE app_vip_benefit
SET status = 'ENABLED',
    update_time = CURRENT_TIMESTAMP
WHERE benefit_code = 'advanced_filter'
  AND status <> 'ENABLED';
