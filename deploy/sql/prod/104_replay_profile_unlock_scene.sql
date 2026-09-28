-- 三天回放列表对所有用户开放；普通用户查看回放主页前按人扣币。
-- 新场景独立定价，默认 20 千寻币；已存在的运营配置不覆盖。
INSERT INTO app_coin_scene_config
    (scene_code, mobile_name, mobile_icon, scene_desc, unit_price,
     retention_days, sort_order, status, deleted)
VALUES
    ('replay_profile_unlock_one', '三天回放查看主页', 'coinUsageRecommend',
     '普通用户查看三天回放中的单人主页，解锁后对该用户永久有效；会员免费',
     20, 0, 9, 'ENABLED', 0)
ON DUPLICATE KEY UPDATE scene_code = VALUES(scene_code);

-- 会员权益文案与新访问规则保持一致，不改变权益编码和启停状态。
UPDATE app_vip_benefit
   SET benefit_name = '三天回放主页免费查看',
       benefit_desc = '三天回放列表对所有用户开放；会员可免费查看回放用户主页',
       update_time = CURRENT_TIMESTAMP
 WHERE benefit_code = 'three_day_replay'
   AND deleted = 0;
