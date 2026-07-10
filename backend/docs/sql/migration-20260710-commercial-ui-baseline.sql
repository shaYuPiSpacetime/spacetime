-- ======================================================
-- 2026-07-10 商业化蓝湖基线数据迁移
-- 目标：配置写入数据库后，管理后台可编辑回显，小程序按接口动态展示。
-- 说明：旧套餐逻辑下线但不物理删除，历史订单继续保留套餐快照和引用。
-- ======================================================

START TRANSACTION;

-- 固定 9 项会员权益。图标保存为客户端 OSS 图标清单中的逻辑键。
UPDATE app_vip_benefit
SET deleted = 1, status = 'DISABLED'
WHERE deleted = 0
  AND benefit_code NOT IN (
    'heart_list', 'visitor_list', 'free_whisper', 'extra_browse', 'advanced_filter',
    'exposure_score', 'privacy', 'three_day_replay', 'daily_heart_chance'
  );

INSERT INTO app_vip_benefit
    (benefit_code, benefit_name, benefit_type, benefit_desc, mobile_icon, benefit_value, fixed_flag, display_order, status, deleted)
VALUES
    ('heart_list', '心动名单一键揭晓', '心动名单', '有人对你心动了，看到喜欢的，立即发起对话', 'heart-list', NULL, 1, 1, 'ENABLED', 0),
    ('visitor_list', '谁来看过你', '访客', '访客全公开，别让在意你的人白等', 'visitor-eye', NULL, 1, 2, 'ENABLED', 0),
    ('free_whisper', '每日专属悄悄话', '免费悄悄话', '消息直接弹到对方主页，第一时间抓住 ta 的目光', 'yo-message', 1, 0, 3, 'ENABLED', 0),
    ('extra_browse', '每日额外浏览', '额外浏览', '每天额外浏览更多嘉宾，发现更契合的人', 'extra-browse', 10, 0, 4, 'ENABLED', 0),
    ('advanced_filter', '精准筛选功能', '高级筛选', '按你条件定向筛选，只看最合心意的人', 'filter', NULL, 1, 5, 'ENABLED', 0),
    ('exposure_score', '曝光度拉满', '曝光', '资料优先展示给活跃用户和你心仪的对象', 'exposure', 80, 0, 6, 'ENABLED', 0),
    ('privacy', '隐身模式', '隐私权益', '只对你选中的人可见，主动权完全在你手上', 'stealth', NULL, 1, 7, 'ENABLED', 0),
    ('three_day_replay', '三天回放功能', '三天回放', '最近 3 天错过的缘分都能找回，手滑也不怕', 'replay', NULL, 1, 8, 'ENABLED', 0),
    ('daily_heart_chance', '每日心动机会', '每日心动机会', '每天额外获得更多心动机会，让缘分不被错过', 'daily-heart', 5, 0, 9, 'ENABLED', 0)
ON DUPLICATE KEY UPDATE
    benefit_name = VALUES(benefit_name),
    benefit_type = VALUES(benefit_type),
    benefit_desc = VALUES(benefit_desc),
    mobile_icon = VALUES(mobile_icon),
    benefit_value = VALUES(benefit_value),
    fixed_flag = VALUES(fixed_flag),
    display_order = VALUES(display_order),
    status = VALUES(status),
    deleted = 0;

-- 蓝湖会员三档。微信连续订阅商品字段不写占位值，继续由运营配置真实商品。
UPDATE app_vip_package SET deleted = 1, status = 'DISABLED' WHERE deleted = 0;

UPDATE app_vip_package SET package_type = 'continuous', subscription_type = 'year', price = 568.00,
    origin_price = 568.00, duration_days = 365, recommend_flag = 1, package_tag = '专属2.4折',
    sort_order = 1, status = 'ENABLED', deleted = 0
WHERE id = (SELECT id FROM (SELECT MIN(id) AS id FROM app_vip_package WHERE package_name = '连续包年') AS selected_row);
INSERT INTO app_vip_package
    (package_name, package_type, subscription_type, price, origin_price, duration_days, recommend_flag, package_tag, sort_order, status, deleted)
SELECT '连续包年', 'continuous', 'year', 568.00, 568.00, 365, 1, '专属2.4折', 1, 'ENABLED', 0
WHERE NOT EXISTS (SELECT 1 FROM app_vip_package WHERE package_name = '连续包年' AND deleted = 0);

UPDATE app_vip_package SET package_type = 'continuous', subscription_type = 'quarter', price = 318.00,
    origin_price = 318.00, duration_days = 90, recommend_flag = 0, package_tag = '专属5.4折',
    sort_order = 2, status = 'ENABLED', deleted = 0
WHERE id = (SELECT id FROM (SELECT MIN(id) AS id FROM app_vip_package WHERE package_name = '连续包季') AS selected_row);
INSERT INTO app_vip_package
    (package_name, package_type, subscription_type, price, origin_price, duration_days, recommend_flag, package_tag, sort_order, status, deleted)
SELECT '连续包季', 'continuous', 'quarter', 318.00, 318.00, 90, 0, '专属5.4折', 2, 'ENABLED', 0
WHERE NOT EXISTS (SELECT 1 FROM app_vip_package WHERE package_name = '连续包季' AND deleted = 0);

UPDATE app_vip_package SET package_type = 'continuous', subscription_type = 'month', price = 198.00,
    origin_price = 198.00, duration_days = 30, recommend_flag = 0, package_tag = '尝鲜首选',
    sort_order = 3, status = 'ENABLED', deleted = 0
WHERE id = (SELECT id FROM (SELECT MIN(id) AS id FROM app_vip_package WHERE package_name = '连续包月') AS selected_row);
INSERT INTO app_vip_package
    (package_name, package_type, subscription_type, price, origin_price, duration_days, recommend_flag, package_tag, sort_order, status, deleted)
SELECT '连续包月', 'continuous', 'month', 198.00, 198.00, 30, 0, '尝鲜首选', 3, 'ENABLED', 0
WHERE NOT EXISTS (SELECT 1 FROM app_vip_package WHERE package_name = '连续包月' AND deleted = 0);

-- 蓝湖千寻币三档，amount/discount_amount 均为真实支付金额。
UPDATE app_coin_package SET deleted = 1, status = 'DISABLED' WHERE deleted = 0;

UPDATE app_coin_package SET amount = 99.00, origin_amount = 0.00, discount_amount = 99.00,
    coin_count = 1000, bonus_coin_count = 0, recommend_flag = 0, package_tag = '尝鲜首选',
    mobile_tag = NULL, package_desc = '多看50位嘉宾', sort_order = 1, status = 'ENABLED', deleted = 0
WHERE id = (SELECT id FROM (SELECT MIN(id) AS id FROM app_coin_package WHERE package_name = '1000千寻币') AS selected_row);
INSERT INTO app_coin_package
    (package_name, amount, origin_amount, discount_amount, coin_count, bonus_coin_count, recommend_flag, package_tag, mobile_tag, package_desc, sort_order, status, deleted)
SELECT '1000千寻币', 99.00, 0.00, 99.00, 1000, 0, 0, '尝鲜首选', NULL, '多看50位嘉宾', 1, 'ENABLED', 0
WHERE NOT EXISTS (SELECT 1 FROM app_coin_package WHERE package_name = '1000千寻币' AND deleted = 0);

UPDATE app_coin_package SET amount = 268.00, origin_amount = 301.12, discount_amount = 268.00,
    coin_count = 3000, bonus_coin_count = 0, recommend_flag = 1, package_tag = '热销推荐',
    mobile_tag = '8.9折', package_desc = NULL, sort_order = 2, status = 'ENABLED', deleted = 0
WHERE id = (SELECT id FROM (SELECT MIN(id) AS id FROM app_coin_package WHERE package_name = '3000千寻币') AS selected_row);
INSERT INTO app_coin_package
    (package_name, amount, origin_amount, discount_amount, coin_count, bonus_coin_count, recommend_flag, package_tag, mobile_tag, package_desc, sort_order, status, deleted)
SELECT '3000千寻币', 268.00, 301.12, 268.00, 3000, 0, 1, '热销推荐', '8.9折', NULL, 2, 'ENABLED', 0
WHERE NOT EXISTS (SELECT 1 FROM app_coin_package WHERE package_name = '3000千寻币' AND deleted = 0);

UPDATE app_coin_package SET amount = 428.00, origin_amount = 602.82, discount_amount = 428.00,
    coin_count = 6000, bonus_coin_count = 0, recommend_flag = 0, package_tag = '节省最多',
    mobile_tag = '7.1折', package_desc = NULL, sort_order = 3, status = 'ENABLED', deleted = 0
WHERE id = (SELECT id FROM (SELECT MIN(id) AS id FROM app_coin_package WHERE package_name = '6000千寻币') AS selected_row);
INSERT INTO app_coin_package
    (package_name, amount, origin_amount, discount_amount, coin_count, bonus_coin_count, recommend_flag, package_tag, mobile_tag, package_desc, sort_order, status, deleted)
SELECT '6000千寻币', 428.00, 602.82, 428.00, 6000, 0, 0, '节省最多', '7.1折', NULL, 3, 'ENABLED', 0
WHERE NOT EXISTS (SELECT 1 FROM app_coin_package WHERE package_name = '6000千寻币' AND deleted = 0);

-- 保留消费业务 code 和真实扣费价格，展示名称/图标按最新蓝湖用途区更新。
UPDATE app_coin_scene_config SET mobile_name = '送悄悄话', mobile_icon = 'coinUsageWhisper', sort_order = 1, status = 'ENABLED', deleted = 0 WHERE scene_code = 'whisper';
UPDATE app_coin_scene_config SET mobile_name = '心动信号', mobile_icon = 'coinUsageHeartbeat', sort_order = 2, status = 'ENABLED', deleted = 0 WHERE scene_code = 'likes_unlock_one';
UPDATE app_coin_scene_config SET mobile_name = '解锁理想型', mobile_icon = 'coinUsageIdealUnlock', sort_order = 3, status = 'ENABLED', deleted = 0 WHERE scene_code = 'viewers_unlock_one';
UPDATE app_coin_scene_config SET mobile_name = '提升人气', mobile_icon = 'coinUsageBoost', sort_order = 4, status = 'ENABLED', deleted = 0 WHERE scene_code = 'ideal_user_unlock';
UPDATE app_coin_scene_config SET mobile_name = '解锁精选', mobile_icon = 'coinUsageCuratedUnlock', sort_order = 5, status = 'ENABLED', deleted = 0 WHERE scene_code = 'ideal_batch_unlock';
UPDATE app_coin_scene_config SET mobile_name = '更多推荐', mobile_icon = 'coinUsageRecommend', sort_order = 6, status = 'ENABLED', deleted = 0 WHERE scene_code = 'compatible_person_unlock_one';
UPDATE app_coin_scene_config SET mobile_name = '匿名解锁', mobile_icon = 'coinUsageAnonymousUnlock', sort_order = 7, status = 'ENABLED', deleted = 0 WHERE scene_code = 'soulmate_mizhiyin_unlock_one';
UPDATE app_coin_scene_config SET mobile_name = '限定活动', mobile_icon = 'coinUsageLimitedActivity', sort_order = 8, status = 'ENABLED', deleted = 0 WHERE scene_code = 'career_recommend_unlock_one';

-- 解锁保留期、社交与订单参数、曝光包预留统一写入 app_config。
INSERT INTO app_config
    (config_key, config_value, config_group, config_type, public_visible, status, remark, deleted)
VALUES
    ('commercial.ideal.batch.max', '5', 'COMMERCIAL', 'NUMBER', 0, 'ENABLED', '理想型批量上限', 0),
    ('commercial.ideal.retention.days', '90', 'COMMERCIAL', 'NUMBER', 0, 'ENABLED', '理想型保留天数', 0),
    ('commercial.view.quota.normal', '10', 'COMMERCIAL', 'NUMBER', 0, 'ENABLED', '普通用户每日查看配额', 0),
    ('commercial.view.quota.vip', '20', 'COMMERCIAL', 'NUMBER', 0, 'ENABLED', '会员每日查看配额', 0),
    ('commercial.vip.expire.remind.days', '3', 'COMMERCIAL', 'NUMBER', 0, 'ENABLED', '会员到期提醒提前天数', 0),
    ('commercial.refund.display', 'true', 'COMMERCIAL', 'BOOLEAN', 0, 'ENABLED', '退款状态前台展示', 0),
    ('commercial.exposure.reserve.enabled', 'false', 'COMMERCIAL', 'BOOLEAN', 0, 'ENABLED', '曝光包预留开关', 0),
    ('commercial.exposure.reserve.description', '首版仅预留，不开放购买', 'COMMERCIAL', 'TEXT', 0, 'ENABLED', '曝光包预留说明', 0)
ON DUPLICATE KEY UPDATE
    config_value = VALUES(config_value),
    config_group = VALUES(config_group),
    config_type = VALUES(config_type),
    public_visible = VALUES(public_visible),
    status = VALUES(status),
    remark = VALUES(remark),
    deleted = 0;

INSERT INTO app_commercial_config_log
    (config_version, change_module, change_summary, operator_name, before_snapshot, after_snapshot)
SELECT 'COMM-UI-20260710', 'commercial', '商业化配置同步最新蓝湖基线并写入数据库', 'database-migration', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM app_commercial_config_log WHERE config_version = 'COMM-UI-20260710');

COMMIT;
