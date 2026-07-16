-- =====================================================
-- PRD01 编辑资料“更多照片”六槽运行时配置修复
-- 仅补充/更新 album.maxCount，不覆盖其他上传规则，可重复执行。
-- =====================================================

INSERT INTO app_config (
    config_key, config_value, config_group, config_type,
    public_visible, status, remark, create_time, update_time, deleted
)
SELECT
    'prd01.upload.rules',
    '{"rows":[{"key":"album","title":"相册照片","maxCount":"6","maxMb":"10","format":"jpg / jpeg / png"}]}',
    'PRD01_UPLOAD', 'JSON', 0, 'ENABLED', '上传限制配置',
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (
    SELECT 1 FROM app_config
    WHERE config_key = 'prd01.upload.rules' AND deleted = 0
);

UPDATE app_config AS config
SET config.config_value = JSON_ARRAY_APPEND(
        COALESCE(config.config_value, JSON_OBJECT('rows', JSON_ARRAY())),
        '$.rows',
        JSON_OBJECT(
            'key', 'album',
            'title', '相册照片',
            'maxCount', '6',
            'maxMb', '10',
            'format', 'jpg / jpeg / png'
        )
    ),
    config.update_time = CURRENT_TIMESTAMP
WHERE config.config_key = 'prd01.upload.rules'
  AND config.deleted = 0
  AND JSON_SEARCH(config.config_value, 'one', 'album', NULL, '$.rows[*].key') IS NULL;

UPDATE app_config AS config
JOIN JSON_TABLE(
    config.config_value,
    '$.rows[*]' COLUMNS (
        row_no FOR ORDINALITY,
        rule_key VARCHAR(32) PATH '$.key'
    )
) AS upload_rule ON upload_rule.rule_key = 'album'
SET config.config_value = JSON_SET(
        config.config_value,
        CONCAT('$.rows[', upload_rule.row_no - 1, '].maxCount'),
        '6'
    ),
    config.status = 'ENABLED',
    config.update_time = CURRENT_TIMESTAMP
WHERE config.config_key = 'prd01.upload.rules'
  AND config.deleted = 0;
