-- 08.27 问题修复：发布动态和时空站台均允许最多 9 张图片。
-- 先补齐缺失配置，再纠正历史上被误改为 1 等值的线上配置。

INSERT INTO app_config (
    config_key, config_value, config_group, config_type,
    public_visible, status, remark
)
SELECT
    'community.post_max_images', '9', 'COMMUNITY', 'NUMBER',
    1, 'ENABLED', '动态与诚意贴图片上限'
WHERE NOT EXISTS (
    SELECT 1
      FROM app_config
     WHERE config_key = 'community.post_max_images'
       AND deleted = 0
);

UPDATE app_config
   SET config_value = '9',
       public_visible = 1,
       status = 'ENABLED',
       remark = '动态与诚意贴图片上限',
       update_time = CURRENT_TIMESTAMP
 WHERE config_key = 'community.post_max_images'
   AND deleted = 0;
