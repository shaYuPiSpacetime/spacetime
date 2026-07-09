-- ======================================================
-- 商业化配置数据对齐
-- 目的：修复早期种子数据里的旧币名、错误编码消费场景，并与 ADM-04 Demo 口径保持一致。
-- ======================================================

SET NAMES utf8mb4;

UPDATE app_vip_benefit
SET benefit_desc = REPLACE(benefit_desc, CONCAT('成', '家币'), '千寻币'),
    update_time = CURRENT_TIMESTAMP
WHERE benefit_desc LIKE CONCAT('%', CONCAT('成', '家币'), '%');

UPDATE app_coin_package
SET package_name = REPLACE(package_name, CONCAT('成', '家币'), '千寻币'),
    package_desc = REPLACE(package_desc, CONCAT('成', '家币'), '千寻币'),
    update_time = CURRENT_TIMESTAMP
WHERE package_name LIKE CONCAT('%', CONCAT('成', '家币'), '%')
   OR package_desc LIKE CONCAT('%', CONCAT('成', '家币'), '%');

DELETE FROM app_coin_scene_config
WHERE scene_code IN (
    'like_me_unlock',
    'visit_me_unlock',
    'ideal_match_unlock',
    'featured_profile_unlock',
    'whisper_message',
    'advanced_filter',
    'priority_exposure',
    'profile_boost',
    'whisper',
    'likes_unlock_one',
    'viewers_unlock_one',
    'ideal_user_unlock',
    'ideal_batch_unlock',
    'compatible_person_unlock_one',
    'soulmate_mizhiyin_unlock_one',
    'career_recommend_unlock_one'
);

INSERT INTO app_coin_scene_config (scene_code, mobile_name, mobile_icon, scene_desc, unit_price, retention_days, sort_order, status) VALUES
('whisper', '发送悄悄话（单次）', 'icon-whisper', '单次发送悄悄话', 12, 0, 1, 'ENABLED'),
('likes_unlock_one', '查看谁喜欢我（单次）', 'icon-heart-unlock', '查看单条喜欢我的清晰信息', 8, 0, 2, 'ENABLED'),
('viewers_unlock_one', '查看谁看过我（单次）', 'icon-eye-unlock', '查看单条访客清晰信息', 8, 0, 3, 'ENABLED'),
('ideal_user_unlock', '解锁理想型用户（单个）', 'icon-target-user', '单个理想型用户解锁', 18, 90, 4, 'ENABLED'),
('ideal_batch_unlock', '批量解锁理想型用户', 'icon-target-batch', '多个理想型用户批量解锁', 15, 90, 5, 'ENABLED'),
('compatible_person_unlock_one', '合拍的人（单个）', 'icon-compatible-person', '由测评结果推荐的人', 20, 90, 6, 'ENABLED'),
('soulmate_mizhiyin_unlock_one', '解锁知音-觅知音（单个）', 'icon-soulmate', '单个解锁知音对象', 28, 90, 7, 'ENABLED'),
('career_recommend_unlock_one', '立业-职业推荐', 'icon-career-recommend', '根据职业测评结果推荐职业，单次解锁；重新完成测评时才需再次解锁', 26, 0, 8, 'ENABLED')
ON DUPLICATE KEY UPDATE
    mobile_name = VALUES(mobile_name),
    mobile_icon = VALUES(mobile_icon),
    scene_desc = VALUES(scene_desc),
    unit_price = VALUES(unit_price),
    retention_days = VALUES(retention_days),
    sort_order = VALUES(sort_order),
    status = VALUES(status),
    update_time = CURRENT_TIMESTAMP;
