-- 千寻成家最新蓝湖稿使用的入口、话题和举报原因；仅补缺失项，不覆盖后台已有文案。
INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time, deleted)
VALUES
('社区话题', 'community_topic', 20, 'ENABLED', '千寻社区话题', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
('社区举报原因', 'community_report_reason', 21, 'ENABLED', '千寻举报原因', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON DUPLICATE KEY UPDATE status = 'ENABLED', update_time = CURRENT_TIMESTAMP, deleted = 0;

INSERT INTO app_config (config_key, config_value, config_group, config_type, public_visible, status, remark, create_time, update_time, deleted)
VALUES ('community.interaction_gate_mode', 'FULL_CERT', 'COMMUNITY', 'TEXT', 1, 'ENABLED', '千寻互动需要三重认证', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON DUPLICATE KEY UPDATE config_value = 'FULL_CERT', public_visible = 1, status = 'ENABLED', update_time = CURRENT_TIMESTAMP, deleted = 0;

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time, deleted)
SELECT seed.dict_type, 0, seed.dict_label, seed.dict_value, seed.dict_sort, 'ENABLED', '千寻社区话题', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
FROM (
    SELECT 'community_topic' dict_type, '露营交友' dict_label, 'camp' dict_value, 1 dict_sort
    UNION ALL SELECT 'community_topic', '认真脱单', 'serious_love', 2
    UNION ALL SELECT 'community_topic', '周末搭子', 'weekend_buddy', 3
) seed
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data target
    WHERE target.dict_type = seed.dict_type AND target.dict_value = seed.dict_value AND target.deleted = 0
);

UPDATE sys_dict_data
SET status = 'DISABLED', update_time = CURRENT_TIMESTAMP
WHERE dict_type = 'community_report_reason'
  AND dict_value IN ('abuse', 'fake_info')
  AND deleted = 0;

UPDATE sys_dict_data
SET dict_label = CASE dict_value
        WHEN 'political_sensitive' THEN '政治敏感'
        WHEN 'violent_pornographic' THEN '暴力色情低俗'
        WHEN 'uncomfortable_content' THEN '内容令人不适'
        WHEN 'unfriendly_content' THEN '不友善的内容'
        WHEN 'rumor_defamation' THEN '造谣诽谤'
        WHEN 'spam' THEN '广告营销'
        WHEN 'contact_disclosure' THEN '透露联系方式'
        WHEN 'other' THEN '其他'
        WHEN 'investment_finance' THEN '发布投资理财相关内容'
        ELSE dict_label END,
    dict_sort = CASE dict_value
        WHEN 'political_sensitive' THEN 1 WHEN 'violent_pornographic' THEN 2
        WHEN 'uncomfortable_content' THEN 3 WHEN 'unfriendly_content' THEN 4
        WHEN 'rumor_defamation' THEN 5 WHEN 'spam' THEN 6
        WHEN 'contact_disclosure' THEN 7 WHEN 'other' THEN 8
        WHEN 'investment_finance' THEN 9 ELSE dict_sort END,
    status = 'ENABLED', update_time = CURRENT_TIMESTAMP
WHERE dict_type = 'community_report_reason'
  AND dict_value IN ('political_sensitive','violent_pornographic','uncomfortable_content','unfriendly_content','rumor_defamation','spam','contact_disclosure','other','investment_finance')
  AND deleted = 0;

UPDATE mobile_entry_config
SET status = 'DISABLED', update_time = CURRENT_TIMESTAMP
WHERE page_code = 'COMMUNITY_HOME_TAB' AND entry_key = 'discover' AND deleted = 0;

INSERT INTO mobile_entry_config
(page_code, entry_key, entry_name, icon, jump_type, jump_target, badge_text, badge_type, login_required, sort, status, create_time, update_time, deleted)
SELECT seed.page_code, seed.entry_key, seed.entry_name, NULL, 'NONE', NULL, NULL, 'NONE', 1, seed.sort, 'ENABLED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
FROM (
    SELECT 'COMMUNITY_HOME_TAB' page_code, 'follow' entry_key, '关注' entry_name, 10 sort
    UNION ALL SELECT 'COMMUNITY_HOME_TAB', 'same_city', '同城', 20
    UNION ALL SELECT 'COMMUNITY_HOME_TAB', 'hot', '热门', 30
) seed
WHERE NOT EXISTS (
    SELECT 1 FROM mobile_entry_config target
    WHERE target.page_code = seed.page_code AND target.entry_key = seed.entry_key AND target.deleted = 0
);

UPDATE mobile_entry_config
SET entry_name = CASE entry_key WHEN 'follow' THEN '关注' WHEN 'same_city' THEN '同城' WHEN 'hot' THEN '热门' ELSE entry_name END,
    status = 'ENABLED', update_time = CURRENT_TIMESTAMP
WHERE page_code = 'COMMUNITY_HOME_TAB' AND entry_key IN ('follow', 'same_city', 'hot') AND deleted = 0;

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time, deleted)
SELECT seed.dict_type, 0, seed.dict_label, seed.dict_value, seed.dict_sort, 'ENABLED', '千寻举报原因', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
FROM (
    SELECT 'community_report_reason' dict_type, '政治敏感' dict_label, 'political_sensitive' dict_value, 1 dict_sort
    UNION ALL SELECT 'community_report_reason', '暴力色情低俗', 'violent_pornographic', 2
    UNION ALL SELECT 'community_report_reason', '内容令人不适', 'uncomfortable_content', 3
    UNION ALL SELECT 'community_report_reason', '不友善的内容', 'unfriendly_content', 4
    UNION ALL SELECT 'community_report_reason', '造谣诽谤', 'rumor_defamation', 5
    UNION ALL SELECT 'community_report_reason', '广告营销', 'spam', 6
    UNION ALL SELECT 'community_report_reason', '透露联系方式', 'contact_disclosure', 7
    UNION ALL SELECT 'community_report_reason', '其他', 'other', 8
    UNION ALL SELECT 'community_report_reason', '发布投资理财相关内容', 'investment_finance', 9
) AS seed
WHERE NOT EXISTS (
    SELECT 1 FROM sys_dict_data target
    WHERE target.dict_type = seed.dict_type
      AND target.dict_value = seed.dict_value
      AND target.deleted = 0
);
