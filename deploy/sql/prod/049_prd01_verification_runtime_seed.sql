-- ======================================================
-- PRD01 认证流程运行时字典与文案
-- 仅覆盖认证目录；登录、首页、个人中心继续使用设计稿固定文案
-- 所有插入均可重复执行，不覆盖后台已经维护的文案内容
-- ======================================================

INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '学历认证人群', 'app_education_user_type', 37, 'ENABLED', '学历认证人群选项', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_education_user_type');
INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '学历认证方式', 'app_education_method', 38, 'ENABLED', '学历认证方式选项', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_education_method');
INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '审核状态', 'app_audit_status', 39, 'ENABLED', '审核状态展示字典', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_audit_status');
INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '审核来源', 'app_audit_source', 40, 'ENABLED', '审核来源展示字典', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_audit_source');
INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '核心准入状态', 'app_core_access_status', 41, 'ENABLED', '核心准入状态展示字典', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_core_access_status');
INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '头像来源', 'app_avatar_source', 42, 'ENABLED', '头像提交来源选项', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_avatar_source');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_education_user_type', 0, '在校生', 'STUDENT', 1, 'ENABLED', '学历认证人群', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_education_user_type' AND dict_value = 'STUDENT');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_education_user_type', 0, '中国大陆毕业生', 'MAINLAND_GRADUATE', 2, 'ENABLED', '学历认证人群', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_education_user_type' AND dict_value = 'MAINLAND_GRADUATE');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_education_method', 0, '学生证或在读证明', 'STUDENT_CARD', 1, 'ENABLED', '学历认证方式', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_education_method' AND dict_value = 'STUDENT_CARD');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_education_method', 0, '学信网在线验证码', 'CHSI', 2, 'ENABLED', '学历认证方式', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_education_method' AND dict_value = 'CHSI');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_education_method', 0, '毕业证或学位证书编号', 'DIPLOMA_NO', 3, 'ENABLED', '学历认证方式', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_education_method' AND dict_value = 'DIPLOMA_NO');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_education_method', 0, '上传毕业证或学位证书', 'MATERIAL_UPLOAD', 4, 'ENABLED', '学历认证方式', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_education_method' AND dict_value = 'MATERIAL_UPLOAD');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_audit_status', 0, '未提交', 'NOT_SUBMITTED', 1, 'ENABLED', '审核状态', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_audit_status' AND dict_value = 'NOT_SUBMITTED');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_audit_status', 0, '待审核', 'PENDING', 2, 'ENABLED', '审核状态', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_audit_status' AND dict_value = 'PENDING');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_audit_status', 0, '审核中', 'REVIEWING', 3, 'ENABLED', '审核状态', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_audit_status' AND dict_value = 'REVIEWING');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_audit_status', 0, '已通过', 'APPROVED', 4, 'ENABLED', '审核状态', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_audit_status' AND dict_value = 'APPROVED');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_audit_status', 0, '已驳回', 'REJECTED', 5, 'ENABLED', '审核状态', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_audit_status' AND dict_value = 'REJECTED');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_audit_status', 0, '已失效', 'EXPIRED', 6, 'ENABLED', '审核状态', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_audit_status' AND dict_value = 'EXPIRED');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_audit_source', 0, '机审', 'MACHINE', 1, 'ENABLED', '审核来源', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_audit_source' AND dict_value = 'MACHINE');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_audit_source', 0, '人工审核', 'MANUAL', 2, 'ENABLED', '审核来源', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_audit_source' AND dict_value = 'MANUAL');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_core_access_status', 0, '核心能力可用', 'CORE_ALLOWED', 1, 'ENABLED', '准入状态', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_core_access_status' AND dict_value = 'CORE_ALLOWED');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_core_access_status', 0, '核心能力受限', 'CORE_BLOCKED', 2, 'ENABLED', '准入状态', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_core_access_status' AND dict_value = 'CORE_BLOCKED');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_core_access_status', 0, '仅非核心能力可用', 'NON_CORE_ONLY', 3, 'ENABLED', '准入状态', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_core_access_status' AND dict_value = 'NON_CORE_ONLY');

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_avatar_source', 0, '拍照', 'CAMERA', 1, 'ENABLED', '头像来源', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_avatar_source' AND dict_value = 'CAMERA');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_avatar_source', 0, '从相册选择', 'ALBUM', 2, 'ENABLED', '头像来源', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_avatar_source' AND dict_value = 'ALBUM');

INSERT INTO app_config (config_key, config_value, config_group, config_type, public_visible, status, remark)
SELECT 'prd01.copy.rules', '{"rows":[]}', 'PRD01_AUDIT', 'JSON', 0, 'ENABLED', '认证流程文案配置'
WHERE NOT EXISTS (SELECT 1 FROM app_config WHERE config_key = 'prd01.copy.rules' AND deleted = 0);

SET @prd01_verification_copy_defaults = '{"rows":[
  {"group":"认证通用文案","scene":"导航标题","copyKey":"verification_nav_title","content":"认证","enabled":true},
  {"group":"认证通用文案","scene":"认证中心标题","copyKey":"verification_center_title","content":"我的认证","enabled":true},
  {"group":"认证通用文案","scene":"认证中心主标题","copyKey":"verification_center_heading","content":"三重认证","enabled":true},
  {"group":"认证通用文案","scene":"认证中心说明","copyKey":"verification_center_notice","content":"完成头像、实名和学历认证，解锁完整交友能力","enabled":true},
  {"group":"认证通用文案","scene":"进入认证","copyKey":"verification_enter_action","content":"去认证","enabled":true},
  {"group":"认证通用文案","scene":"头像标题","copyKey":"verification_avatar_title","content":"头像认证","enabled":true},
  {"group":"认证通用文案","scene":"头像说明","copyKey":"verification_avatar_desc","content":"提交本人清晰正脸头像","enabled":true},
  {"group":"认证通用文案","scene":"实名标题","copyKey":"verification_real_name_title","content":"实名认证","enabled":true},
  {"group":"认证通用文案","scene":"实名说明","copyKey":"verification_real_name_desc","content":"核验真实身份信息","enabled":true},
  {"group":"认证通用文案","scene":"学历标题","copyKey":"verification_education_title","content":"学历认证","enabled":true},
  {"group":"认证通用文案","scene":"学历说明","copyKey":"verification_education_desc","content":"核验真实学历信息","enabled":true},
  {"group":"认证通用文案","scene":"提交","copyKey":"common_submit_action","content":"提交","enabled":true},
  {"group":"认证通用文案","scene":"提交中","copyKey":"common_submitting_action","content":"提交中","enabled":true},
  {"group":"认证通用文案","scene":"上传中","copyKey":"common_uploading_action","content":"上传中","enabled":true},
  {"group":"认证通用文案","scene":"加载中","copyKey":"common_loading_action","content":"正在加载...","enabled":true},
  {"group":"认证通用文案","scene":"加载失败标题","copyKey":"common_load_failed_title","content":"加载失败","enabled":true},
  {"group":"认证通用文案","scene":"加载失败说明","copyKey":"common_load_failed_message","content":"认证信息加载失败，请稍后重试","enabled":true},
  {"group":"认证通用文案","scene":"重新加载","copyKey":"common_retry_action","content":"重新加载","enabled":true},
  {"group":"认证通用文案","scene":"选择占位","copyKey":"common_select_placeholder","content":"请选择","enabled":true},
  {"group":"认证通用文案","scene":"取消","copyKey":"common_cancel_action","content":"取消","enabled":true},
  {"group":"认证通用文案","scene":"确认","copyKey":"common_confirm_action","content":"确认","enabled":true},
  {"group":"认证通用文案","scene":"返回认证中心","copyKey":"verification_back_center_action","content":"返回认证中心","enabled":true},
  {"group":"认证强引导","scene":"主标题","copyKey":"verification_onboarding_heading","content":"完善资料和认证","enabled":true},
  {"group":"认证强引导","scene":"说明","copyKey":"verification_onboarding_notice","content":"时空邂逅是一个严肃、靠谱的交友平台，请认真填写资料","enabled":true},
  {"group":"认证强引导","scene":"步骤-基本资料","copyKey":"verification_step_basic","content":"基本资料","enabled":true},
  {"group":"认证强引导","scene":"步骤-添加头像","copyKey":"verification_step_avatar","content":"添加头像","enabled":true},
  {"group":"认证强引导","scene":"步骤-自我介绍","copyKey":"verification_step_intro","content":"自我介绍","enabled":true},
  {"group":"认证强引导","scene":"步骤-三重认证","copyKey":"verification_step_triple","content":"三重认证","enabled":true},
  {"group":"认证强引导","scene":"下一步","copyKey":"verification_next_action","content":"下一步","enabled":true},
  {"group":"认证拦截页","scene":"初始态第二行标题","copyKey":"verification_home_initial_heading_line2","content":"解锁更多专属权益","enabled":true},
  {"group":"认证拦截页","scene":"初始态说明","copyKey":"verification_home_initial_notice","content":"资料信息越完整，脱单邂逅更高效","enabled":true},
  {"group":"认证拦截页","scene":"部分完成态说明","copyKey":"verification_home_partial_notice","content":"拦不住不真诚、资料虚假的用户，营造严肃靠谱的交友环境","enabled":true},
  {"group":"认证拦截页","scene":"基本资料标题","copyKey":"verification_home_basic_title","content":"基本资料","enabled":true},
  {"group":"认证拦截页","scene":"基本资料说明","copyKey":"verification_home_basic_desc","content":"快速了解，提高匹配效率","enabled":true},
  {"group":"认证拦截页","scene":"头像简介标题","copyKey":"verification_home_avatar_intro_title","content":"头像简介","enabled":true},
  {"group":"认证拦截页","scene":"头像简介说明","copyKey":"verification_home_avatar_intro_desc","content":"真实友好，获得有效曝光","enabled":true},
  {"group":"认证拦截页","scene":"三重认证标题","copyKey":"verification_home_triple_title","content":"三重认证","enabled":true},
  {"group":"认证拦截页","scene":"三重认证说明","copyKey":"verification_home_triple_desc","content":"头像·实名·学历认证，严肃认真","enabled":true},
  {"group":"认证拦截页","scene":"主按钮","copyKey":"verification_home_primary_action","content":"立即完善","enabled":true},
  {"group":"认证拦截页","scene":"稍后操作","copyKey":"verification_home_later_action","content":"稍后再说","enabled":true},
  {"group":"头像认证","scene":"页面标题","copyKey":"avatar_title","content":"添加本人头像","enabled":true},
  {"group":"头像认证","scene":"页面说明","copyKey":"avatar_notice","content":"请上传本人清晰头像，避免遮挡、多人合照或明显修图","enabled":true},
  {"group":"头像认证","scene":"选择中","copyKey":"avatar_choosing_action","content":"正在打开","enabled":true},
  {"group":"头像认证","scene":"来源无效","copyKey":"avatar_source_invalid","content":"头像来源配置已变化，请返回重新选择","enabled":true},
  {"group":"头像认证","scene":"裁剪说明","copyKey":"avatar_crop_notice","content":"请将人物主体放在裁剪框内，确保正脸清晰完整","enabled":true},
  {"group":"头像认证","scene":"头像引导标题","copyKey":"avatar_guide_title","content":"选一张你满意的头像","enabled":true},
  {"group":"头像认证","scene":"本人照片规则","copyKey":"avatar_rule_self","content":"本人照片","enabled":true},
  {"group":"头像认证","scene":"清晰长相规则","copyKey":"avatar_rule_clear","content":"能看清长相","enabled":true},
  {"group":"头像认证","scene":"最佳展示规则","copyKey":"avatar_rule_best","content":"展示完美的你","enabled":true},
  {"group":"头像认证","scene":"不通过标题","copyKey":"avatar_invalid_title","content":"以下照片不能通过审核","enabled":true},
  {"group":"头像认证","scene":"非人物照","copyKey":"avatar_invalid_non_person","content":"非人物照","enabled":true},
  {"group":"头像认证","scene":"风景照","copyKey":"avatar_invalid_landscape","content":"风景照","enabled":true},
  {"group":"头像认证","scene":"模糊遮挡","copyKey":"avatar_invalid_blurred","content":"模糊遮挡","enabled":true},
  {"group":"头像认证","scene":"无正脸","copyKey":"avatar_invalid_no_face","content":"无正脸","enabled":true},
  {"group":"头像认证","scene":"选择照片按钮","copyKey":"avatar_choose_action","content":"知道了，去选照片","enabled":true},
  {"group":"自我介绍认证","scene":"区域标题","copyKey":"intro_section_title","content":"自我描述","enabled":true},
  {"group":"自我介绍认证","scene":"输入提示","copyKey":"intro_placeholder","content":"简单描述下自己是怎么一个人，性格、习惯、爱好、优点、缺点等，不少于20字","enabled":true},
  {"group":"自我介绍认证","scene":"最少字数提示","copyKey":"intro_minimum_hint","content":"最少20字","enabled":true},
  {"group":"三重认证","scene":"安全说明","copyKey":"triple_safety_notice","content":"确保信息真实才可在平台交友，与官方数据联网比对，承诺保障信息安全","enabled":true},
  {"group":"实名认证","scene":"页面标题","copyKey":"real_name_title","content":"实名认证","enabled":true},
  {"group":"实名认证","scene":"页面说明","copyKey":"real_name_notice","content":"实名认证信息仅用于身份核验，请填写真实姓名和身份证号","enabled":true},
  {"group":"实名认证","scene":"姓名标签","copyKey":"real_name_name_label","content":"姓名","enabled":true},
  {"group":"实名认证","scene":"姓名占位","copyKey":"real_name_name_placeholder","content":"请输入真实姓名","enabled":true},
  {"group":"实名认证","scene":"身份证标签","copyKey":"real_name_id_label","content":"身份证号","enabled":true},
  {"group":"实名认证","scene":"身份证占位","copyKey":"real_name_id_placeholder","content":"请输入身份证号","enabled":true},
  {"group":"实名认证","scene":"承诺必选","copyKey":"real_name_agreement_required","content":"请先阅读并同意实名认证承诺","enabled":true},
  {"group":"学历认证","scene":"页面说明","copyKey":"education_notice","content":"学历认证用于提升资料可信度，审核通过后将在资料中展示认证标识","enabled":true},
  {"group":"学历认证","scene":"上传说明","copyKey":"education_upload_notice","content":"请上传清晰、完整、无遮挡的学历证明材料","enabled":true},
  {"group":"学历认证","scene":"选择方式","copyKey":"education_method_select_title","content":"选择学历认证方式","enabled":true},
  {"group":"学历认证","scene":"认证人群","copyKey":"education_user_type_label","content":"认证人群","enabled":true},
  {"group":"学历认证","scene":"学校标签","copyKey":"education_school_label","content":"学校名称","enabled":true},
  {"group":"学历认证","scene":"学校占位","copyKey":"education_school_placeholder","content":"请输入学校名称","enabled":true},
  {"group":"学历认证","scene":"学历标签","copyKey":"education_level_label","content":"学历","enabled":true},
  {"group":"学历认证","scene":"学信验证码标签","copyKey":"education_chsi_label","content":"在线验证码","enabled":true},
  {"group":"学历认证","scene":"学信验证码占位","copyKey":"education_chsi_placeholder","content":"请输入12-18位在线验证码","enabled":true},
  {"group":"学历认证","scene":"证书编号标签","copyKey":"education_diploma_label","content":"证书编号","enabled":true},
  {"group":"学历认证","scene":"证书编号占位","copyKey":"education_diploma_placeholder","content":"请输入毕业证或学位证编号","enabled":true},
  {"group":"学历认证","scene":"证书姓名标签","copyKey":"education_certificate_name_label","content":"证书姓名","enabled":true},
  {"group":"学历认证","scene":"证书姓名占位","copyKey":"education_certificate_name_placeholder","content":"请输入证书上的姓名","enabled":true},
  {"group":"学历认证","scene":"上传操作","copyKey":"education_upload_action","content":"上传学历材料","enabled":true},
  {"group":"学历认证","scene":"上传数量已满","copyKey":"education_upload_limit_reached","content":"已达到学历材料上传数量上限","enabled":true},
  {"group":"学历认证","scene":"方式不可用","copyKey":"education_method_unavailable","content":"当前认证方式暂不可用，请刷新后重试","enabled":true},
  {"group":"学历认证","scene":"协议必选","copyKey":"education_agreement_required","content":"请先阅读并同意学历认证协议","enabled":true},
  {"group":"学历认证","scene":"学信方式说明","copyKey":"education_method_chsi_desc","content":"使用学信网在线验证报告验证码认证","enabled":true},
  {"group":"学历认证","scene":"证书编号方式说明","copyKey":"education_method_diploma_no_desc","content":"填写毕业证或学位证编号及证书姓名","enabled":true},
  {"group":"学历认证","scene":"材料方式说明","copyKey":"education_method_material_upload_desc","content":"上传毕业证或学位证材料等待审核","enabled":true},
  {"group":"协议文案","scene":"单身承诺函","copyKey":"agreement_single_commitment","content":"本人承诺当前为单身状态，并对提交信息真实性负责","enabled":true},
  {"group":"协议文案","scene":"学历认证协议","copyKey":"agreement_education","content":"本人授权平台对学校、学历、证书编号和学历材料进行认证审核","enabled":true}
]}';

UPDATE app_config AS target
SET config_value = JSON_SET(
        COALESCE(target.config_value, JSON_OBJECT()),
        '$.rows',
        JSON_MERGE_PRESERVE(
            COALESCE(JSON_EXTRACT(target.config_value, '$.rows'), JSON_ARRAY()),
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_EXTRACT(@prd01_verification_copy_defaults, CONCAT('$.rows[', defaults_row.row_no - 1, ']'))
                )
                FROM JSON_TABLE(
                    @prd01_verification_copy_defaults,
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

SET @prd01_verification_copy_defaults = NULL;
