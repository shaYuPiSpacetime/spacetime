-- ======================================================
-- PRD01 编辑资料与“我的认证”蓝湖页动态文案
-- 1. 输入型字段与选择型字段使用不同占位文案。
-- 2. “我的认证”独立详情页文案全部由运行时配置下发。
-- 可重复执行。
-- ======================================================

INSERT INTO app_config (config_key, config_value, config_group, config_type, public_visible, status, remark)
SELECT 'prd01.copy.rules', '{"rows":[]}', 'PRD01_AUDIT', 'JSON', 0, 'ENABLED', '认证流程文案配置'
WHERE NOT EXISTS (SELECT 1 FROM app_config WHERE config_key = 'prd01.copy.rules' AND deleted = 0);

SET @prd01_profile_edit_copy = '{"rows":[
  {"group":"通用提示","scene":"输入占位","copyKey":"common_input_placeholder","content":"请输入","enabled":true},
  {"group":"我的认证","scene":"页面主标题","copyKey":"verification_detail_heading","content":"为什么要认证","enabled":true},
  {"group":"我的认证","scene":"页面说明","copyKey":"verification_detail_notice","content":"头像/学历/实名认证，让千万用户安心交友","enabled":true},
  {"group":"我的认证","scene":"已认证状态","copyKey":"verification_detail_verified","content":"已认证","enabled":true},
  {"group":"我的认证","scene":"头像说明","copyKey":"verification_detail_avatar_desc","content":"真人真照，大胆心动","enabled":true},
  {"group":"我的认证","scene":"实名说明","copyKey":"verification_detail_real_name_desc","content":"真实身份，放心交友","enabled":true},
  {"group":"我的认证","scene":"学历说明","copyKey":"verification_detail_education_desc","content":"真实学历，同频社交","enabled":true},
  {"group":"我的认证","scene":"姓名标签","copyKey":"verification_detail_name_label","content":"姓名","enabled":true},
  {"group":"我的认证","scene":"证件号标签","copyKey":"verification_detail_id_label","content":"证件号","enabled":true},
  {"group":"我的认证","scene":"学校标签","copyKey":"verification_detail_school_label","content":"学校","enabled":true},
  {"group":"我的认证","scene":"学历标签","copyKey":"verification_detail_degree_label","content":"学历","enabled":true},
  {"group":"我的认证","scene":"更新认证","copyKey":"verification_detail_update_action","content":"更新认证","enabled":true},
  {"group":"我的认证","scene":"安全说明","copyKey":"verification_detail_safety_notice","content":"确保信息真实才可在平台交友，与官方数据联网比对，承诺保障信息安全","enabled":true}
]}';

UPDATE app_config AS target
SET config_value = JSON_SET(
        COALESCE(target.config_value, JSON_OBJECT()),
        '$.rows',
        JSON_MERGE_PRESERVE(
            COALESCE(JSON_EXTRACT(target.config_value, '$.rows'), JSON_ARRAY()),
            COALESCE((
                SELECT JSON_ARRAYAGG(JSON_EXTRACT(@prd01_profile_edit_copy, CONCAT('$.rows[', defaults_row.row_no - 1, ']')))
                FROM JSON_TABLE(
                    @prd01_profile_edit_copy,
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
WHERE target.config_key = 'prd01.copy.rules' AND target.deleted = 0;

SET @prd01_profile_edit_copy = NULL;
