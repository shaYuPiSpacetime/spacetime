-- ======================================================
-- PRD01 认证蓝湖闭环文案与学历字典修正
-- 1. 新增页面文案按 copyKey 幂等补齐。
-- 2. 修正此前已落库但与蓝湖定稿不一致的默认文案。
-- 3. 枚举展示名称继续由字典配置下发，不在小程序写死。
-- 可重复执行。
-- ======================================================

INSERT INTO app_config (config_key, config_value, config_group, config_type, public_visible, status, remark)
SELECT 'prd01.copy.rules', '{"rows":[]}', 'PRD01_AUDIT', 'JSON', 0, 'ENABLED', '认证流程文案配置'
WHERE NOT EXISTS (SELECT 1 FROM app_config WHERE config_key = 'prd01.copy.rules' AND deleted = 0);

SET @prd01_lanhu_copy = '{"rows":[
  {"group":"基础资料","scene":"导航标题","copyKey":"profile_basic_nav_title","content":"基本资料","enabled":true},
  {"group":"基础资料","scene":"页面标题","copyKey":"profile_basic_heading","content":"完善资料","enabled":true},
  {"group":"基础资料","scene":"页面说明","copyKey":"profile_basic_notice","content":"时空邂逅是一个严肃、靠谱的交友平台，请认真填写资料","enabled":true},
  {"group":"通用操作","scene":"保存","copyKey":"common_save_action","content":"保存","enabled":true},
  {"group":"通用操作","scene":"保存中","copyKey":"common_saving_action","content":"保存中...","enabled":true},
  {"group":"通用提示","scene":"保存成功","copyKey":"common_save_success","content":"保存成功","enabled":true},
  {"group":"认证通用文案","scene":"头像步骤","copyKey":"verification_status_avatar","content":"头像","enabled":true},
  {"group":"认证通用文案","scene":"实名步骤","copyKey":"verification_status_real_name","content":"实名","enabled":true},
  {"group":"认证通用文案","scene":"学历步骤","copyKey":"verification_status_education","content":"学历","enabled":true},
  {"group":"认证通用文案","scene":"联系客服","copyKey":"common_customer_service","content":"联系客服","enabled":true},
  {"group":"协议文案","scene":"协议勾选前缀","copyKey":"agreement_read_prefix","content":"我已查看并同意 ","enabled":true},
  {"group":"协议文案","scene":"单身承诺协议名称","copyKey":"agreement_single_commitment_name","content":"单身承诺协议","enabled":true},
  {"group":"协议文案","scene":"学历协议名称","copyKey":"agreement_education_name","content":"学历信息认证服务协议","enabled":true},
  {"group":"头像认证","scene":"裁剪失败","copyKey":"avatar_crop_export_failed","content":"照片裁剪失败，请重试","enabled":true},
  {"group":"学历认证","scene":"页面标题","copyKey":"education_title","content":"学历认证","enabled":true},
  {"group":"学历认证","scene":"在校学生选项卡","copyKey":"education_tab_student","content":"在校学生","enabled":true},
  {"group":"学历认证","scene":"中国大陆选项卡","copyKey":"education_tab_mainland","content":"中国大陆","enabled":true},
  {"group":"学历认证","scene":"方式分组标题","copyKey":"education_method_section_title","content":"选择认证方式","enabled":true},
  {"group":"学历认证","scene":"推荐标识","copyKey":"education_method_recommended_badge","content":"推荐","enabled":true},
  {"group":"学历认证","scene":"较慢标识","copyKey":"education_method_slow_badge","content":"较慢","enabled":true},
  {"group":"学历认证","scene":"在校信息标题","copyKey":"education_student_form_title","content":"填写在校信息","enabled":true},
  {"group":"学历认证","scene":"在校材料说明","copyKey":"education_student_upload_notice","content":"不要涂抹，需要露出姓名/学校名称及学历层次信息","enabled":true},
  {"group":"学历认证","scene":"上传数量模板","copyKey":"education_upload_count_template","content":"上传证明材料({count}/{max})","enabled":true},
  {"group":"学历认证","scene":"证书规则标题","copyKey":"education_diploma_rules_title","content":"认证说明","enabled":true},
  {"group":"学历认证","scene":"毕业证编号规则","copyKey":"education_diploma_rule_one","content":"1、若您使用毕业证书编号，请确保在2001年以后毕业，否则请点击上传证书认证；","enabled":true},
  {"group":"学历认证","scene":"学位证编号规则","copyKey":"education_diploma_rule_two","content":"2、若您使用学位证书编号，请确保在2008年9月1日获得学位，否则请点击上传证书认证。","enabled":true},
  {"group":"学历认证","scene":"学信指引标题","copyKey":"education_chsi_guide_title","content":"如何获取学信网在线验证码？","enabled":true},
  {"group":"学历认证","scene":"学信指引说明","copyKey":"education_chsi_guide_notice","content":"请按以下步骤获取有效的在线验证码","enabled":true},
  {"group":"学历认证","scene":"打开学信网","copyKey":"education_chsi_open_action","content":"打开学信网","enabled":true},
  {"group":"学历认证","scene":"学信步骤一标题","copyKey":"education_chsi_step_one_title","content":"• STEP 1","enabled":true},
  {"group":"学历认证","scene":"学信步骤一说明","copyKey":"education_chsi_step_one_desc","content":"前往学信网官网，选择【学信档案】登录或注册学信网账号","enabled":true},
  {"group":"学历认证","scene":"学信步骤二标题","copyKey":"education_chsi_step_two_title","content":"• STEP 2","enabled":true},
  {"group":"学历认证","scene":"学信步骤二说明","copyKey":"education_chsi_step_two_desc","content":"登录并进入学信档案页面，选择【在线验证报告】","enabled":true},
  {"group":"学历认证","scene":"学信步骤三标题","copyKey":"education_chsi_step_three_title","content":"• STEP 3","enabled":true},
  {"group":"学历认证","scene":"学信步骤三说明","copyKey":"education_chsi_step_three_desc","content":"选择【教育部学籍在线验证报告】","enabled":true},
  {"group":"学历认证","scene":"学信步骤四标题","copyKey":"education_chsi_step_four_title","content":"• STEP 4","enabled":true},
  {"group":"学历认证","scene":"学信步骤四说明","copyKey":"education_chsi_step_four_desc","content":"复制在线验证码（请确保验证码有效状态，否则认证会失败）","enabled":true}
]}';

UPDATE app_config AS target
SET config_value = JSON_SET(
        COALESCE(target.config_value, JSON_OBJECT()),
        '$.rows',
        JSON_MERGE_PRESERVE(
            COALESCE(JSON_EXTRACT(target.config_value, '$.rows'), JSON_ARRAY()),
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_EXTRACT(@prd01_lanhu_copy, CONCAT('$.rows[', defaults_row.row_no - 1, ']'))
                )
                FROM JSON_TABLE(
                    @prd01_lanhu_copy,
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

-- 蓝湖已定稿文案属于本次产品升级，已有旧默认值也需要同步修正。
SET @copy_path = (SELECT JSON_UNQUOTE(JSON_SEARCH(config_value, 'one', 'avatar_crop_notice', NULL, '$.rows[*].copyKey')) FROM app_config WHERE config_key = 'prd01.copy.rules' AND deleted = 0 LIMIT 1);
UPDATE app_config SET config_value = JSON_SET(config_value, REPLACE(@copy_path, '.copyKey', '.content'), '为保证卡片展示完整，请将人物主体放虚线框内'), update_time = CURRENT_TIMESTAMP WHERE config_key = 'prd01.copy.rules' AND deleted = 0 AND @copy_path IS NOT NULL;
SET @copy_path = (SELECT JSON_UNQUOTE(JSON_SEARCH(config_value, 'one', 'real_name_notice', NULL, '$.rows[*].copyKey')) FROM app_config WHERE config_key = 'prd01.copy.rules' AND deleted = 0 LIMIT 1);
UPDATE app_config SET config_value = JSON_SET(config_value, REPLACE(@copy_path, '.copyKey', '.content'), '使用公安系统验证身份真实性，信息仅用于验证身份场景。全程采用阿里云智能加密，保护隐私数据'), update_time = CURRENT_TIMESTAMP WHERE config_key = 'prd01.copy.rules' AND deleted = 0 AND @copy_path IS NOT NULL;
SET @copy_path = (SELECT JSON_UNQUOTE(JSON_SEARCH(config_value, 'one', 'education_notice', NULL, '$.rows[*].copyKey')) FROM app_config WHERE config_key = 'prd01.copy.rules' AND deleted = 0 LIMIT 1);
UPDATE app_config SET config_value = JSON_SET(config_value, REPLACE(@copy_path, '.copyKey', '.content'), '完成学历认证，和我们一起打造真实靠谱高质量交友社区'), update_time = CURRENT_TIMESTAMP WHERE config_key = 'prd01.copy.rules' AND deleted = 0 AND @copy_path IS NOT NULL;
SET @copy_path = (SELECT JSON_UNQUOTE(JSON_SEARCH(config_value, 'one', 'education_method_chsi_desc', NULL, '$.rows[*].copyKey')) FROM app_config WHERE config_key = 'prd01.copy.rules' AND deleted = 0 LIMIT 1);
UPDATE app_config SET config_value = JSON_SET(config_value, REPLACE(@copy_path, '.copyKey', '.content'), '提交在线验证码，快速完成认证'), update_time = CURRENT_TIMESTAMP WHERE config_key = 'prd01.copy.rules' AND deleted = 0 AND @copy_path IS NOT NULL;
SET @copy_path = (SELECT JSON_UNQUOTE(JSON_SEARCH(config_value, 'one', 'education_method_diploma_no_desc', NULL, '$.rows[*].copyKey')) FROM app_config WHERE config_key = 'prd01.copy.rules' AND deleted = 0 LIMIT 1);
UPDATE app_config SET config_value = JSON_SET(config_value, REPLACE(@copy_path, '.copyKey', '.content'), '输入毕业证或者学位证编号，24小时内完成审核'), update_time = CURRENT_TIMESTAMP WHERE config_key = 'prd01.copy.rules' AND deleted = 0 AND @copy_path IS NOT NULL;
SET @copy_path = (SELECT JSON_UNQUOTE(JSON_SEARCH(config_value, 'one', 'education_method_material_upload_desc', NULL, '$.rows[*].copyKey')) FROM app_config WHERE config_key = 'prd01.copy.rules' AND deleted = 0 LIMIT 1);
UPDATE app_config SET config_value = JSON_SET(config_value, REPLACE(@copy_path, '.copyKey', '.content'), '提交相关资料后，24小时内完成审核'), update_time = CURRENT_TIMESTAMP WHERE config_key = 'prd01.copy.rules' AND deleted = 0 AND @copy_path IS NOT NULL;
SET @copy_path = (SELECT JSON_UNQUOTE(JSON_SEARCH(config_value, 'one', 'education_upload_action', NULL, '$.rows[*].copyKey')) FROM app_config WHERE config_key = 'prd01.copy.rules' AND deleted = 0 LIMIT 1);
UPDATE app_config SET config_value = JSON_SET(config_value, REPLACE(@copy_path, '.copyKey', '.content'), '上传材料'), update_time = CURRENT_TIMESTAMP WHERE config_key = 'prd01.copy.rules' AND deleted = 0 AND @copy_path IS NOT NULL;
SET @copy_path = (SELECT JSON_UNQUOTE(JSON_SEARCH(config_value, 'one', 'education_upload_notice', NULL, '$.rows[*].copyKey')) FROM app_config WHERE config_key = 'prd01.copy.rules' AND deleted = 0 LIMIT 1);
UPDATE app_config SET config_value = JSON_SET(config_value, REPLACE(@copy_path, '.copyKey', '.content'), '不要涂抹，需要露出姓名/学校名称及学历层次信息'), update_time = CURRENT_TIMESTAMP WHERE config_key = 'prd01.copy.rules' AND deleted = 0 AND @copy_path IS NOT NULL;

UPDATE sys_dict_data SET dict_label = '在校学生', update_time = CURRENT_TIMESTAMP WHERE dict_type = 'app_education_user_type' AND dict_value = 'STUDENT';
UPDATE sys_dict_data SET dict_label = '学信网验证编码', update_time = CURRENT_TIMESTAMP WHERE dict_type = 'app_education_method' AND dict_value = 'CHSI';
UPDATE sys_dict_data SET dict_label = '毕业证或者学位证书编号', update_time = CURRENT_TIMESTAMP WHERE dict_type = 'app_education_method' AND dict_value = 'DIPLOMA_NO';
UPDATE sys_dict_data SET dict_label = '上传毕业证或学位证书', update_time = CURRENT_TIMESTAMP WHERE dict_type = 'app_education_method' AND dict_value = 'MATERIAL_UPLOAD';

SET @copy_path = NULL;
SET @prd01_lanhu_copy = NULL;
