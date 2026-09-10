-- 管理后台知音归属筛选与时空站台展示文案。
-- 稳定业务编码保持不变：soulmate=心灵搭子，station=时空站台，sincere_post=时空站台内容。

INSERT INTO sys_dict_type (
    dict_name, dict_type, dict_sort, status, remark,
    create_time, update_time, deleted
)
VALUES (
    '知音归属模块', 'community_zhiyin_section', 73, 'ENABLED', '内容管理知音归属筛选',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
)
ON DUPLICATE KEY UPDATE
    dict_name = VALUES(dict_name),
    dict_sort = VALUES(dict_sort),
    status = 'ENABLED',
    remark = VALUES(remark),
    update_time = CURRENT_TIMESTAMP,
    deleted = 0;

UPDATE sys_dict_data
SET dict_label = CASE dict_value
        WHEN 'soulmate' THEN '心灵搭子'
        WHEN 'station' THEN '时空站台'
        ELSE dict_label
    END,
    dict_sort = CASE dict_value
        WHEN 'soulmate' THEN 1
        WHEN 'station' THEN 2
        ELSE dict_sort
    END,
    status = 'ENABLED',
    remark = '内容管理知音归属筛选',
    update_time = CURRENT_TIMESTAMP,
    deleted = 0
WHERE dict_type = 'community_zhiyin_section'
  AND dict_value IN ('soulmate', 'station');

INSERT INTO sys_dict_data (
    dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark,
    create_time, update_time, deleted
)
SELECT seed.dict_type, 0, seed.dict_label, seed.dict_value, seed.dict_sort,
       'ENABLED', '内容管理知音归属筛选', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
FROM (
    SELECT 'community_zhiyin_section' AS dict_type, '心灵搭子' AS dict_label,
           'soulmate' AS dict_value, 1 AS dict_sort
    UNION ALL
    SELECT 'community_zhiyin_section', '时空站台', 'station', 2
) seed
WHERE NOT EXISTS (
    SELECT 1
    FROM sys_dict_data current_item
    WHERE current_item.dict_type = seed.dict_type
      AND current_item.dict_value = seed.dict_value
      AND current_item.deleted = 0
);

-- 管理后台不再展示历史产品名“诚意贴”，仅更新中文标签，不修改存量业务编码。
UPDATE sys_dict_data
SET dict_label = CASE
        WHEN dict_type = 'community_content_type' AND dict_value = 'sincere_post' THEN '时空站台'
        WHEN dict_type = 'community_source_scene' AND dict_value = 'qianxun_zhiyin_sincere' THEN '时空站台'
        WHEN dict_type = 'community_report_target_type' AND dict_value = 'post' THEN '动态/时空站台'
        WHEN dict_type = 'community_write_scope' AND dict_value = 'publish_sincere' THEN '发布时空站台'
        ELSE dict_label
    END,
    update_time = CURRENT_TIMESTAMP
WHERE deleted = 0
  AND (
      (dict_type = 'community_content_type' AND dict_value = 'sincere_post')
      OR (dict_type = 'community_source_scene' AND dict_value = 'qianxun_zhiyin_sincere')
      OR (dict_type = 'community_report_target_type' AND dict_value = 'post')
      OR (dict_type = 'community_write_scope' AND dict_value = 'publish_sincere')
  );

INSERT INTO app_config (
    config_key, config_value, config_group, config_type,
    public_visible, status, remark, create_time, update_time, deleted
)
VALUES
    ('community.copy.config_name_sincere_min_text', '时空站台正文下限', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '配置名称', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0),
    ('community.copy.config_name_contact_allowed', '时空站台联系方式开关', 'COMMUNITY_COPY', 'TEXT', 0, 'ENABLED', '配置名称', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON DUPLICATE KEY UPDATE
    config_value = VALUES(config_value),
    config_group = VALUES(config_group),
    config_type = VALUES(config_type),
    public_visible = VALUES(public_visible),
    status = VALUES(status),
    remark = VALUES(remark),
    update_time = CURRENT_TIMESTAMP,
    deleted = 0;

UPDATE app_config
SET remark = CASE config_key
        WHEN 'community.post_max_images' THEN '动态与时空站台图片上限'
        WHEN 'community.sincere_post_min_text_length' THEN '时空站台正文最小长度'
        ELSE remark
    END,
    update_time = CURRENT_TIMESTAMP
WHERE deleted = 0
  AND config_key IN (
      'community.post_max_images',
      'community.sincere_post_min_text_length'
  );
