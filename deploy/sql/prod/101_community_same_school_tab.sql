-- 千寻成家“同校”入口及空态文案；重复部署不覆盖后台后续调整。
INSERT INTO mobile_entry_config
    (page_code, entry_key, entry_name, icon, jump_type, jump_target, badge_text, badge_type,
     login_required, sort, status, create_time, update_time, deleted)
SELECT 'COMMUNITY_HOME_TAB', 'same_school', '同校', NULL, 'NONE', NULL, NULL, 'NONE',
       1, 25, 'ENABLED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (
    SELECT 1 FROM mobile_entry_config
    WHERE page_code = 'COMMUNITY_HOME_TAB' AND entry_key = 'same_school' AND deleted = 0
);

INSERT INTO app_config
    (config_key, config_value, config_group, config_type, public_visible, status, remark)
SELECT seed.config_key, seed.config_value, 'COMMUNITY_COPY', 'TEXT', 1, 'ENABLED', '千寻同校空态'
FROM (
    SELECT 'community.copy.empty_school_feed' AS config_key, '同校暂时没有新动态' AS config_value
    UNION ALL SELECT 'community.copy.empty_school_missing', '请先填写学校信息'
    UNION ALL SELECT 'community.copy.empty_school_description', '填写学校后即可浏览同校动态'
) seed
WHERE NOT EXISTS (
    SELECT 1 FROM app_config existing
    WHERE existing.config_key = seed.config_key AND existing.deleted = 0
);
