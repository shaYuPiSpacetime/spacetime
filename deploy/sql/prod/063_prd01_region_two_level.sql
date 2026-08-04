-- =============================================================
-- PRD01 现居地、家乡统一省市两级
-- 说明：退役两个区县字段的展示、必填和计分配置；增量幂等。
-- 历史 app_user 区县值不在迁移中批量删除，用户下次保存基础资料时由服务层清理。
-- =============================================================

SET @region_field_path = (
    SELECT JSON_UNQUOTE(JSON_SEARCH(config_value, 'one', 'locationDistrict', NULL, '$.rows[*].fieldId'))
      FROM app_config
     WHERE config_key = 'prd01.profile.fieldSettings' AND deleted = 0
     LIMIT 1
);
UPDATE app_config
   SET config_value = JSON_SET(
           config_value,
           REPLACE(@region_field_path, '.fieldId', '.visible'), JSON_EXTRACT('false', '$'),
           REPLACE(@region_field_path, '.fieldId', '.required'), JSON_EXTRACT('false', '$'),
           REPLACE(@region_field_path, '.fieldId', '.requiredMode'), 'none',
           REPLACE(@region_field_path, '.fieldId', '.scoreEnabled'), JSON_EXTRACT('false', '$')
       ),
       update_time = CURRENT_TIMESTAMP
 WHERE config_key = 'prd01.profile.fieldSettings'
   AND deleted = 0
   AND @region_field_path IS NOT NULL;

SET @region_field_path = (
    SELECT JSON_UNQUOTE(JSON_SEARCH(config_value, 'one', 'hometownDistrict', NULL, '$.rows[*].fieldId'))
      FROM app_config
     WHERE config_key = 'prd01.profile.fieldSettings' AND deleted = 0
     LIMIT 1
);
UPDATE app_config
   SET config_value = JSON_SET(
           config_value,
           REPLACE(@region_field_path, '.fieldId', '.visible'), JSON_EXTRACT('false', '$'),
           REPLACE(@region_field_path, '.fieldId', '.required'), JSON_EXTRACT('false', '$'),
           REPLACE(@region_field_path, '.fieldId', '.requiredMode'), 'none',
           REPLACE(@region_field_path, '.fieldId', '.scoreEnabled'), JSON_EXTRACT('false', '$')
       ),
       update_time = CURRENT_TIMESTAMP
 WHERE config_key = 'prd01.profile.fieldSettings'
   AND deleted = 0
   AND @region_field_path IS NOT NULL;

SET @region_score_path = (
    SELECT JSON_UNQUOTE(JSON_SEARCH(config_value, 'one', 'locationDistrict', NULL, '$.rows[*].fieldId'))
      FROM app_config
     WHERE config_key = 'prd01.profile.scoreWeights' AND deleted = 0
     LIMIT 1
);
UPDATE app_config
   SET config_value = JSON_SET(
           config_value,
           REPLACE(@region_score_path, '.fieldId', '.scoreEnabled'), JSON_EXTRACT('false', '$'),
           REPLACE(@region_score_path, '.fieldId', '.studentScore'), 0,
           REPLACE(@region_score_path, '.fieldId', '.workerScore'), 0
       ),
       update_time = CURRENT_TIMESTAMP
 WHERE config_key = 'prd01.profile.scoreWeights'
   AND deleted = 0
   AND @region_score_path IS NOT NULL;

SET @region_score_path = (
    SELECT JSON_UNQUOTE(JSON_SEARCH(config_value, 'one', 'hometownDistrict', NULL, '$.rows[*].fieldId'))
      FROM app_config
     WHERE config_key = 'prd01.profile.scoreWeights' AND deleted = 0
     LIMIT 1
);
UPDATE app_config
   SET config_value = JSON_SET(
           config_value,
           REPLACE(@region_score_path, '.fieldId', '.scoreEnabled'), JSON_EXTRACT('false', '$'),
           REPLACE(@region_score_path, '.fieldId', '.studentScore'), 0,
           REPLACE(@region_score_path, '.fieldId', '.workerScore'), 0
       ),
       update_time = CURRENT_TIMESTAMP
 WHERE config_key = 'prd01.profile.scoreWeights'
   AND deleted = 0
   AND @region_score_path IS NOT NULL;

SELECT config_key, config_value
  FROM app_config
 WHERE config_key IN ('prd01.profile.fieldSettings', 'prd01.profile.scoreWeights')
   AND deleted = 0;
