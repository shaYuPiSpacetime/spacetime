-- ======================================================
-- PRD01 mobile-api handoff 运行时契约修复
-- 1. 语音必须使用微信录音管理器支持的 mp3，不得回退成图片格式。
-- 2. 个人背景图最多一张；只修正该规则，不覆盖后台维护的其他上传项。
-- 3. 认证加载、失败和重试提示全部来自后台文案配置。
-- 可重复执行。
-- ======================================================

INSERT INTO app_config (config_key, config_value, config_group, config_type, public_visible, status, remark)
SELECT 'prd01.upload.rules', '{"rows":[]}', 'PRD01_UPLOAD', 'JSON', 0, 'ENABLED', '上传限制配置'
WHERE NOT EXISTS (
    SELECT 1 FROM app_config WHERE config_key = 'prd01.upload.rules' AND deleted = 0
);

-- 历史异常数据无法被运行时解析时，恢复为空数组后再补齐必需项。
UPDATE app_config
SET config_value = '{"rows":[]}',
    update_time = CURRENT_TIMESTAMP
WHERE config_key = 'prd01.upload.rules'
  AND deleted = 0
  AND (
      config_value IS NULL
      OR JSON_VALID(config_value) = 0
      OR JSON_EXTRACT(config_value, '$.rows') IS NULL
      OR JSON_TYPE(JSON_EXTRACT(config_value, '$.rows')) <> 'ARRAY'
  );

SET @prd01_voice_default = '{"key":"voice","title":"语音介绍","maxCount":"1","maxMb":"20","format":"mp3","minDuration":"10","maxDuration":"60"}';
SET @prd01_voice_key_path = (
    SELECT JSON_UNQUOTE(JSON_SEARCH(config_value, 'one', 'voice', NULL, '$.rows[*].key'))
    FROM app_config
    WHERE config_key = 'prd01.upload.rules' AND deleted = 0
    LIMIT 1
);
SET @prd01_voice_row_path = REPLACE(@prd01_voice_key_path, '.key', '');

UPDATE app_config
SET config_value = CASE
        WHEN @prd01_voice_row_path IS NULL THEN
            JSON_ARRAY_APPEND(config_value, '$.rows', JSON_EXTRACT(@prd01_voice_default, '$'))
        ELSE
            JSON_SET(
                config_value,
                CONCAT(@prd01_voice_row_path, '.maxCount'), '1',
                CONCAT(@prd01_voice_row_path, '.maxMb'), '20',
                CONCAT(@prd01_voice_row_path, '.format'), 'mp3',
                CONCAT(@prd01_voice_row_path, '.minDuration'), '10',
                CONCAT(@prd01_voice_row_path, '.maxDuration'), '60'
            )
    END,
    update_time = CURRENT_TIMESTAMP
WHERE config_key = 'prd01.upload.rules' AND deleted = 0;

-- 认证页的加载、失败和重试同样属于后台文案配置，禁止写死在小程序中。
SET @prd01_verification_boundary_copy = '{"rows":[
  {"group":"认证通用文案","scene":"加载中","copyKey":"common_loading_action","content":"正在加载...","enabled":true},
  {"group":"认证通用文案","scene":"加载失败标题","copyKey":"common_load_failed_title","content":"加载失败","enabled":true},
  {"group":"认证通用文案","scene":"加载失败说明","copyKey":"common_load_failed_message","content":"认证信息加载失败，请稍后重试","enabled":true},
  {"group":"认证通用文案","scene":"重新加载","copyKey":"common_retry_action","content":"重新加载","enabled":true}
]}';

UPDATE app_config AS target
SET config_value = JSON_SET(
        COALESCE(target.config_value, JSON_OBJECT()),
        '$.rows',
        JSON_MERGE_PRESERVE(
            COALESCE(JSON_EXTRACT(target.config_value, '$.rows'), JSON_ARRAY()),
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_EXTRACT(@prd01_verification_boundary_copy, CONCAT('$.rows[', defaults_row.row_no - 1, ']'))
                )
                FROM JSON_TABLE(
                    @prd01_verification_boundary_copy,
                    '$.rows[*]' COLUMNS (
                        row_no FOR ORDINALITY,
                        copy_key VARCHAR(128) PATH '$.copyKey'
                    )
                ) AS defaults_row
                WHERE JSON_SEARCH(target.config_value, 'one', defaults_row.copy_key, NULL, '$.rows[*].copyKey') IS NULL
            ), JSON_ARRAY())
        )
    ),
    update_time = CURRENT_TIMESTAMP
WHERE target.config_key = 'prd01.copy.rules'
  AND target.deleted = 0;

SET @prd01_profile_bg_default = '{"key":"profileBg","title":"资料背景图","maxCount":"1","maxMb":"10","format":"jpg / jpeg / png"}';
SET @prd01_profile_bg_key_path = (
    SELECT JSON_UNQUOTE(JSON_SEARCH(config_value, 'one', 'profileBg', NULL, '$.rows[*].key'))
    FROM app_config
    WHERE config_key = 'prd01.upload.rules' AND deleted = 0
    LIMIT 1
);
SET @prd01_profile_bg_row_path = REPLACE(@prd01_profile_bg_key_path, '.key', '');

UPDATE app_config
SET config_value = CASE
        WHEN @prd01_profile_bg_row_path IS NULL THEN
            JSON_ARRAY_APPEND(config_value, '$.rows', JSON_EXTRACT(@prd01_profile_bg_default, '$'))
        ELSE
            JSON_SET(config_value, CONCAT(@prd01_profile_bg_row_path, '.maxCount'), '1')
    END,
    update_time = CURRENT_TIMESTAMP
WHERE config_key = 'prd01.upload.rules' AND deleted = 0;

SET @prd01_voice_default = NULL;
SET @prd01_voice_key_path = NULL;
SET @prd01_voice_row_path = NULL;
SET @prd01_profile_bg_default = NULL;
SET @prd01_profile_bg_key_path = NULL;
SET @prd01_profile_bg_row_path = NULL;
SET @prd01_verification_boundary_copy = NULL;
