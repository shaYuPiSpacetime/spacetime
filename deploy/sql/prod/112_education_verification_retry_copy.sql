-- 学历认证驳回重填：只按 copyKey 缺失追加，不覆盖运营文案、enabled 或配置 status。
-- 前置：存在 deleted=0 的 prd01.copy.rules，config_value 是有效 JSON 且 rows 为数组。
-- 预检不是 READY 时必须先修复配置；下方 UPDATE 会保护跳过异常行，不重建/覆盖旧配置。
-- 不涉及用户、审核记录、推广或材料数据；重复执行不追加重复 key，也不改 update_time。

SELECT CASE
    WHEN COUNT(*) = 0 THEN 'MISSING_CONFIG'
    WHEN COUNT(*) <> 1 THEN 'DUPLICATE_CONFIG'
    WHEN SUM(CASE WHEN JSON_VALID(config_value) = 1
        AND JSON_TYPE(JSON_EXTRACT(
            CASE WHEN JSON_VALID(config_value) = 1 THEN config_value ELSE JSON_OBJECT() END,
            '$.rows')) = 'ARRAY' THEN 1 ELSE 0 END) = 1 THEN 'READY'
    ELSE 'INVALID_CONFIG'
END AS education_retry_copy_precheck
FROM app_config
WHERE config_key = 'prd01.copy.rules' AND deleted = 0;

SET @prd01_education_retry_copy = '{"rows":[
  {"group":"学历认证重填文案","scene":"学校名称校验","copyKey":"education_school_invalid","content":"请输入2–100字的学校名称","enabled":true},
  {"group":"学历认证重填文案","scene":"旧学校待确认","copyKey":"education_school_selection_required","content":"旧学校信息未确认，请重新搜索并点选学校","enabled":true},
  {"group":"学历认证重填文案","scene":"学历校验","copyKey":"education_level_required","content":"请选择有效的学历","enabled":true},
  {"group":"学历认证重填文案","scene":"学信网验证码校验","copyKey":"education_chsi_invalid","content":"学信网在线验证码需为12–18位字母或数字","enabled":true},
  {"group":"学历认证重填文案","scene":"证书编号校验","copyKey":"education_diploma_invalid","content":"请填写有效的证书编号，最多64字","enabled":true},
  {"group":"学历认证重填文案","scene":"证书姓名校验","copyKey":"education_certificate_name_invalid","content":"请填写证书姓名，最多50字","enabled":true},
  {"group":"学历认证重填文案","scene":"材料必填校验","copyKey":"education_material_required","content":"请至少上传1张学历证明材料","enabled":true},
  {"group":"学历认证重填文案","scene":"材料数量校验","copyKey":"education_material_limit_invalid","content":"学历证明材料最多{max}张，请删除多余材料","enabled":true},
  {"group":"学历认证重填文案","scene":"重新提交动作","copyKey":"education_resubmit_action","content":"重新提交","enabled":true},
  {"group":"学历认证重填文案","scene":"重新选校动作","copyKey":"education_reselect_school_action","content":"重新选择学校","enabled":true},
  {"group":"学历认证重填文案","scene":"替换材料动作","copyKey":"education_material_replace_action","content":"替换","enabled":true},
  {"group":"学历认证重填文案","scene":"删除材料动作","copyKey":"education_material_remove_action","content":"删除","enabled":true},
  {"group":"学历认证重填文案","scene":"材料预览失败","copyKey":"education_material_preview_failed","content":"材料预览失败，可重试或替换","enabled":true},
  {"group":"学历认证重填文案","scene":"学校搜索无结果","copyKey":"education_school_search_empty","content":"未找到学校，请修改名称后重新搜索或联系客服","enabled":true},
  {"group":"学历认证重填文案","scene":"学校搜索失败","copyKey":"education_school_search_failed","content":"学校搜索失败，请重新搜索","enabled":true},
  {"group":"学历认证重填文案","scene":"学历提交成功","copyKey":"education_submit_success_notice","content":"学历认证已提交，请耐心等待审核","enabled":true}
]}';

UPDATE app_config AS target
SET config_value = JSON_SET(
        CASE WHEN JSON_VALID(target.config_value) = 1
            THEN target.config_value ELSE JSON_OBJECT() END,
        '$.rows',
        JSON_MERGE_PRESERVE(
            JSON_EXTRACT(CASE WHEN JSON_VALID(target.config_value) = 1
                THEN target.config_value ELSE JSON_OBJECT() END, '$.rows'),
            COALESCE((
                SELECT JSON_ARRAYAGG(JSON_EXTRACT(
                    @prd01_education_retry_copy, CONCAT('$.rows[', defaults_row.row_no - 1, ']')))
                FROM JSON_TABLE(
                    @prd01_education_retry_copy,
                    '$.rows[*]' COLUMNS (
                        row_no FOR ORDINALITY,
                        copy_key VARCHAR(128) PATH '$.copyKey'
                    )
                ) AS defaults_row
                WHERE JSON_SEARCH(
                    CASE WHEN JSON_VALID(target.config_value) = 1
                        THEN target.config_value ELSE JSON_OBJECT() END,
                    'one', REPLACE(defaults_row.copy_key, '_', '!_'), '!', '$.rows[*].copyKey') IS NULL
            ), JSON_ARRAY())
        )
    ),
    update_time = CURRENT_TIMESTAMP
WHERE target.config_key = 'prd01.copy.rules'
  AND target.deleted = 0
  AND JSON_VALID(target.config_value) = 1
  AND JSON_TYPE(JSON_EXTRACT(
      CASE WHEN JSON_VALID(target.config_value) = 1
          THEN target.config_value ELSE JSON_OBJECT() END, '$.rows')) = 'ARRAY'
  AND EXISTS (
      SELECT 1
      FROM JSON_TABLE(
          @prd01_education_retry_copy,
          '$.rows[*]' COLUMNS (copy_key VARCHAR(128) PATH '$.copyKey')
      ) AS missing_row
      WHERE JSON_SEARCH(
          CASE WHEN JSON_VALID(target.config_value) = 1
              THEN target.config_value ELSE JSON_OBJECT() END,
          'one', REPLACE(missing_row.copy_key, '_', '!_'), '!', '$.rows[*].copyKey') IS NULL
  );

SET @prd01_education_retry_copy = NULL;
