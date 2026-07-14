-- =====================================================
-- PRD-01 小程序动态枚举与运行时文案
-- 说明：业务表仍只保存 code；中文 label 和页面提示由接口动态下发。
-- =====================================================

INSERT INTO sys_dict_type (dict_name, dict_type, dict_sort, status, remark, create_time, update_time)
SELECT '性别', 'app_gender', 36, 'ENABLED', '小程序性别选项', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE dict_type = 'app_gender');
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
SELECT 'app_gender', 0, '女', 'FEMALE', 1, 'ENABLED', '性别', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_gender' AND dict_value = 'FEMALE');
INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_gender', 0, '男', 'MALE', 2, 'ENABLED', '性别', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_gender' AND dict_value = 'MALE');

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

INSERT INTO sys_dict_data (dict_type, parent_id, dict_label, dict_value, dict_sort, status, remark, create_time, update_time)
SELECT 'app_profile_tag', 0, '全部', 'ALL', 0, 'ENABLED', '标签分类', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_data WHERE dict_type = 'app_profile_tag' AND dict_value = 'ALL');

-- 语音介绍的格式、大小上限由上传规则统一下发，前后端不各自写死。
UPDATE app_config
SET config_value = JSON_ARRAY_APPEND(
        config_value,
        '$.rows',
        JSON_OBJECT('key', 'voice', 'title', '语音介绍', 'maxCount', '1', 'maxMb', '20', 'format', 'mp3 / aac / wav', 'minDuration', '10', 'maxDuration', '60')
    ),
    update_time = CURRENT_TIMESTAMP
WHERE config_key = 'prd01.upload.rules'
  AND JSON_SEARCH(config_value, 'one', 'voice', NULL, '$.rows[*].key') IS NULL;

-- 默认文案先进入会话变量，随后只向现有配置追加缺失 copyKey，不覆盖运营内容。
SET @prd01_mobile_copy_defaults = '{"rows":[
  {"group":"准入拦截文案","scene":"未完成资料","copyKey":"core_access_profile_incomplete","content":"请先完善基础资料后继续使用该功能","enabled":true},
  {"group":"准入拦截文案","scene":"三重认证未通过","copyKey":"core_access_triple_not_passed","content":"请完成实名、头像、学历三重认证后继续使用","enabled":true},
  {"group":"准入拦截文案","scene":"账号异常","copyKey":"core_access_account_abnormal","content":"账号状态异常，暂无法使用该功能，请联系客服","enabled":true},
  {"group":"准入拦截文案","scene":"校验中","copyKey":"access_checking_title","content":"正在校验准入状态","enabled":true},
  {"group":"准入拦截文案","scene":"受限标题","copyKey":"access_blocked_title","content":"当前功能暂不可用","enabled":true},
  {"group":"准入拦截文案","scene":"完善认证","copyKey":"access_complete_action","content":"去完善资料与认证","enabled":true},
  {"group":"准入拦截文案","scene":"重试","copyKey":"common_retry_action","content":"重新加载","enabled":true},
  {"group":"登录文案","scene":"登录协议标题","copyKey":"login_agreement_title","content":"用户协议与隐私政策","enabled":true},
  {"group":"登录文案","scene":"登录协议说明","copyKey":"login_agreement_notice","content":"请阅读并同意用户协议与隐私政策后继续使用","enabled":true},
  {"group":"登录文案","scene":"同意按钮","copyKey":"login_agree_action","content":"同意并继续","enabled":true},
  {"group":"登录文案","scene":"不同意按钮","copyKey":"login_disagree_action","content":"暂不同意","enabled":true},
  {"group":"登录文案","scene":"微信登录","copyKey":"login_wechat_action","content":"微信手机号快捷登录","enabled":true},
  {"group":"登录文案","scene":"手机登录","copyKey":"login_phone_action","content":"手机号验证码登录","enabled":true},
  {"group":"登录文案","scene":"立即使用","copyKey":"login_use_action","content":"立即使用","enabled":true},
  {"group":"登录文案","scene":"登录方式标题","copyKey":"login_method_title","content":"选择登录方式","enabled":true},
  {"group":"登录文案","scene":"协议勾选前缀","copyKey":"login_agreement_check_prefix","content":"我已阅读并同意","enabled":true},
  {"group":"登录文案","scene":"协议连接词","copyKey":"login_agreement_joiner","content":"和","enabled":true},
  {"group":"登录文案","scene":"协议详情","copyKey":"login_agreement_detail","content":"登录即表示你已充分阅读、理解并接受上述协议内容。","enabled":true},
  {"group":"登录文案","scene":"授权中","copyKey":"login_authorizing_action","content":"授权中","enabled":true},
  {"group":"登录文案","scene":"微信授权超时","copyKey":"login_wechat_timeout","content":"微信授权超时，请重试","enabled":true},
  {"group":"登录文案","scene":"微信授权取消","copyKey":"login_wechat_cancelled","content":"已取消微信授权","enabled":true},
  {"group":"登录文案","scene":"微信登录码失败","copyKey":"login_wechat_code_failed","content":"获取微信登录凭证失败，请重试","enabled":true},
  {"group":"手机号登录","scene":"页面标题","copyKey":"phone_login_title","content":"你的手机号是","enabled":true},
  {"group":"手机号登录","scene":"页面说明","copyKey":"phone_login_notice","content":"请输入你要登录的手机号","enabled":true},
  {"group":"手机号登录","scene":"手机号输入","copyKey":"phone_login_placeholder","content":"请输入手机号","enabled":true},
  {"group":"手机号登录","scene":"验证码输入","copyKey":"phone_sms_placeholder","content":"请输入验证码","enabled":true},
  {"group":"手机号登录","scene":"发送验证码","copyKey":"phone_sms_send_action","content":"获取验证码","enabled":true},
  {"group":"手机号登录","scene":"缺少输入","copyKey":"phone_login_required","content":"请填写手机号和验证码","enabled":true},
  {"group":"手机号登录","scene":"登录成功","copyKey":"login_success","content":"登录成功","enabled":true},
  {"group":"首登文案","scene":"性别说明","copyKey":"init_gender_notice","content":"你的性别","enabled":true},
  {"group":"首登文案","scene":"选择标题","copyKey":"init_select_title","content":"请选择","enabled":true},
  {"group":"首登文案","scene":"性别必填","copyKey":"init_gender_required","content":"请选择性别","enabled":true},
  {"group":"首登文案","scene":"出生日期说明","copyKey":"init_birthday_notice","content":"你的出生日期","enabled":true},
  {"group":"首登文案","scene":"出生日期占位","copyKey":"init_birthday_placeholder","content":"请选择出生日期","enabled":true},
  {"group":"首登文案","scene":"出生日期必填","copyKey":"init_birthday_required","content":"请选择出生日期","enabled":true},
  {"group":"首登文案","scene":"身份说明","copyKey":"init_identity_notice","content":"你的身份","enabled":true},
  {"group":"首登文案","scene":"身份必填","copyKey":"init_identity_required","content":"请选择身份","enabled":true},
  {"group":"首登文案","scene":"学历说明","copyKey":"init_education_notice","content":"你的最高学历","enabled":true},
  {"group":"首登文案","scene":"学历必填","copyKey":"init_education_required","content":"请选择学历","enabled":true},
  {"group":"首登文案","scene":"居住地说明","copyKey":"init_location_notice","content":"你的居住地","enabled":true},
  {"group":"首登文案","scene":"居住地必填","copyKey":"init_location_required","content":"请选择居住地","enabled":true},
  {"group":"首登文案","scene":"省份占位","copyKey":"init_location_province_placeholder","content":"请选择省份","enabled":true},
  {"group":"首登文案","scene":"城市占位","copyKey":"init_location_city_placeholder","content":"请选择城市","enabled":true},
  {"group":"首登文案","scene":"区县占位","copyKey":"init_location_district_placeholder","content":"请选择区县（可选）","enabled":true},
  {"group":"首登文案","scene":"定位按钮","copyKey":"init_location_current_action","content":"定位当前位置","enabled":true},
  {"group":"首登文案","scene":"手动选择","copyKey":"init_location_manual_action","content":"手动选择地区","enabled":true},
  {"group":"首登文案","scene":"可选步骤","copyKey":"init_skip_action","content":"暂时跳过","enabled":true},
  {"group":"认证提示文案","scene":"实名认证说明","copyKey":"real_name_notice","content":"实名认证信息仅用于身份核验，请填写真实姓名和身份证号","enabled":true},
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
  {"group":"认证通用文案","scene":"选择占位","copyKey":"common_select_placeholder","content":"请选择","enabled":true},
  {"group":"认证通用文案","scene":"取消","copyKey":"common_cancel_action","content":"取消","enabled":true},
  {"group":"认证通用文案","scene":"确认","copyKey":"common_confirm_action","content":"确认","enabled":true},
  {"group":"实名认证","scene":"页面标题","copyKey":"real_name_title","content":"实名认证","enabled":true},
  {"group":"实名认证","scene":"姓名标签","copyKey":"real_name_name_label","content":"姓名","enabled":true},
  {"group":"实名认证","scene":"姓名占位","copyKey":"real_name_name_placeholder","content":"请输入真实姓名","enabled":true},
  {"group":"实名认证","scene":"身份证标签","copyKey":"real_name_id_label","content":"身份证号","enabled":true},
  {"group":"实名认证","scene":"身份证占位","copyKey":"real_name_id_placeholder","content":"请输入身份证号","enabled":true},
  {"group":"实名认证","scene":"协议必选","copyKey":"real_name_agreement_required","content":"请先阅读并同意实名认证承诺","enabled":true},
  {"group":"认证提示文案","scene":"头像认证说明","copyKey":"avatar_notice","content":"请上传本人清晰头像，避免遮挡、多人合照或明显修图","enabled":true},
  {"group":"头像认证","scene":"页面标题","copyKey":"avatar_title","content":"添加本人头像","enabled":true},
  {"group":"头像认证","scene":"打开相机或相册","copyKey":"avatar_choosing_action","content":"正在打开","enabled":true},
  {"group":"头像认证","scene":"来源失效","copyKey":"avatar_source_invalid","content":"头像来源配置已变化，请返回重新选择","enabled":true},
  {"group":"头像认证","scene":"裁剪说明","copyKey":"avatar_crop_notice","content":"请将人物主体放在裁剪框内，确保正脸清晰完整","enabled":true},
  {"group":"头像认证","scene":"返回认证中心","copyKey":"verification_back_center_action","content":"返回认证中心","enabled":true},
  {"group":"认证提示文案","scene":"学历认证说明","copyKey":"education_notice","content":"学历认证用于提升资料可信度，审核通过后将在资料中展示认证标识","enabled":true},
  {"group":"认证提示文案","scene":"材料上传说明","copyKey":"education_upload_notice","content":"请上传清晰、完整、无遮挡的学历证明材料","enabled":true},
  {"group":"学历认证","scene":"方式选择标题","copyKey":"education_method_select_title","content":"选择学历认证方式","enabled":true},
  {"group":"学历认证","scene":"认证人群标签","copyKey":"education_user_type_label","content":"认证人群","enabled":true},
  {"group":"学历认证","scene":"学校标签","copyKey":"education_school_label","content":"学校名称","enabled":true},
  {"group":"学历认证","scene":"学校占位","copyKey":"education_school_placeholder","content":"请输入学校名称","enabled":true},
  {"group":"学历认证","scene":"学历标签","copyKey":"education_level_label","content":"学历","enabled":true},
  {"group":"学历认证","scene":"学信码标签","copyKey":"education_chsi_label","content":"在线验证码","enabled":true},
  {"group":"学历认证","scene":"学信码占位","copyKey":"education_chsi_placeholder","content":"请输入12-18位在线验证码","enabled":true},
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
  {"group":"协议文案","scene":"用户协议","copyKey":"agreement_user","content":"请阅读并同意《用户协议》后继续使用","enabled":true},
  {"group":"协议文案","scene":"隐私政策","copyKey":"agreement_privacy","content":"请阅读并同意《隐私政策》后继续使用","enabled":true},
  {"group":"协议文案","scene":"单身承诺函","copyKey":"agreement_single_commitment","content":"本人承诺当前为单身状态，并对提交信息真实性负责","enabled":true},
  {"group":"协议文案","scene":"学历认证协议","copyKey":"agreement_education","content":"本人授权平台对学校、学历、证书编号和学历材料进行认证审核","enabled":true},
  {"group":"异常文案","scene":"年龄不符","copyKey":"error_age_not_allowed","content":"当前年龄不符合平台准入要求","enabled":true},
  {"group":"异常文案","scene":"定位失败","copyKey":"error_location_failed","content":"定位失败，请手动选择所在地区","enabled":true},
  {"group":"异常文案","scene":"上传失败","copyKey":"error_upload_failed","content":"上传失败，请检查网络后重试","enabled":true},
  {"group":"异常文案","scene":"第三方不可用","copyKey":"error_provider_unavailable","content":"认证服务暂不可用，请稍后重试，已填写内容会保留","enabled":true},
  {"group":"开放文本长度","scene":"关于我","copyKey":"text_length_about_me","content":"关于我需要填写20-300字","enabled":true},
  {"group":"开放文本长度","scene":"资料问答","copyKey":"text_length_profile_qa","content":"回答需要填写2-500字","enabled":true}
  ,{"group":"资料编辑","scene":"页面标题","copyKey":"profile_edit_title","content":"编辑资料","enabled":true}
  ,{"group":"资料编辑","scene":"基础资料分组","copyKey":"profile_basic_section_title","content":"基础资料","enabled":true}
  ,{"group":"资料编辑","scene":"扩展资料分组","copyKey":"profile_extended_section_title","content":"更多资料","enabled":true}
  ,{"group":"资料编辑","scene":"保存按钮","copyKey":"profile_save_action","content":"保存","enabled":true}
  ,{"group":"资料编辑","scene":"保存成功","copyKey":"profile_save_success","content":"保存成功","enabled":true}
  ,{"group":"资料编辑","scene":"输入占位","copyKey":"profile_input_placeholder","content":"请输入","enabled":true}
  ,{"group":"资料编辑","scene":"必填标记","copyKey":"common_required_mark","content":" *","enabled":true}
  ,{"group":"资料编辑","scene":"现居地","copyKey":"profile_location_label","content":"现居地","enabled":true}
  ,{"group":"资料编辑","scene":"家乡","copyKey":"profile_hometown_label","content":"家乡","enabled":true}
  ,{"group":"资料编辑","scene":"省份","copyKey":"profile_province_label","content":"省份","enabled":true}
  ,{"group":"资料编辑","scene":"城市","copyKey":"profile_city_label","content":"城市","enabled":true}
  ,{"group":"资料编辑","scene":"区县","copyKey":"profile_district_label","content":"区县","enabled":true}
  ,{"group":"资料编辑","scene":"脱单目标","copyKey":"profile_dating_goal_label","content":"脱单目标","enabled":true}
  ,{"group":"资料编辑","scene":"感情状态","copyKey":"profile_emotional_status_label","content":"感情状态","enabled":true}
  ,{"group":"资料编辑","scene":"微信号","copyKey":"profile_wechat_label","content":"微信号","enabled":true}
  ,{"group":"资料编辑","scene":"微信号占位","copyKey":"profile_wechat_placeholder","content":"请输入微信号","enabled":true}
  ,{"group":"资料编辑","scene":"保存微信号","copyKey":"profile_wechat_save_action","content":"保存微信号","enabled":true}
  ,{"group":"资料编辑","scene":"标签入口","copyKey":"profile_tags_entry","content":"我的标签","enabled":true}
  ,{"group":"资料编辑","scene":"标签上限","copyKey":"profile_tag_limit_reached","content":"最多选择16个标签","enabled":true}
  ,{"group":"资料编辑","scene":"自我介绍入口","copyKey":"profile_intro_entry","content":"自我介绍","enabled":true}
  ,{"group":"资料编辑","scene":"自我介绍说明","copyKey":"profile_intro_notice","content":"介绍自己的性格、习惯和生活方式，让对方更了解你","enabled":true}
  ,{"group":"资料编辑","scene":"自我介绍占位","copyKey":"profile_intro_placeholder","content":"写下你的自我介绍","enabled":true}
  ,{"group":"资料编辑","scene":"关于我入口","copyKey":"profile_about_entry","content":"关于我","enabled":true}
  ,{"group":"资料编辑","scene":"歌曲入口","copyKey":"profile_song_entry","content":"爱听的歌曲","enabled":true}
  ,{"group":"资料编辑","scene":"歌曲搜索占位","copyKey":"profile_song_search_placeholder","content":"搜索歌曲名称或歌手","enabled":true}
  ,{"group":"资料编辑","scene":"歌曲搜索","copyKey":"profile_song_search_action","content":"搜索","enabled":true}
  ,{"group":"资料编辑","scene":"歌曲选择","copyKey":"profile_song_select_action","content":"选择","enabled":true}
  ,{"group":"资料编辑","scene":"歌曲保存成功","copyKey":"profile_song_save_success","content":"歌曲保存成功","enabled":true}
  ,{"group":"资料编辑","scene":"认证入口","copyKey":"profile_certification_entry","content":"我的认证","enabled":true}
  ,{"group":"资料媒体","scene":"相册入口","copyKey":"profile_album_entry","content":"我的相册","enabled":true}
  ,{"group":"资料媒体","scene":"相册说明","copyKey":"profile_album_notice","content":"上传能展示真实生活状态的清晰照片，提交后将进行审核","enabled":true}
  ,{"group":"资料媒体","scene":"添加照片","copyKey":"profile_album_add_action","content":"添加照片","enabled":true}
  ,{"group":"资料媒体","scene":"替换照片","copyKey":"profile_album_replace_action","content":"替换照片","enabled":true}
  ,{"group":"资料媒体","scene":"删除照片","copyKey":"profile_album_delete_action","content":"删除照片","enabled":true}
  ,{"group":"资料媒体","scene":"相册上限","copyKey":"profile_album_limit_reached","content":"已达到相册照片数量上限","enabled":true}
  ,{"group":"资料媒体","scene":"背景图入口","copyKey":"profile_background_entry","content":"主页背景图","enabled":true}
  ,{"group":"资料媒体","scene":"背景图说明","copyKey":"profile_background_notice","content":"选择一张清晰图片作为个人主页背景，提交后将进行审核","enabled":true}
  ,{"group":"资料媒体","scene":"上传背景图","copyKey":"profile_background_upload_action","content":"上传背景图","enabled":true}
  ,{"group":"资料媒体","scene":"删除背景图","copyKey":"profile_background_delete_action","content":"删除背景图","enabled":true}
  ,{"group":"资料媒体","scene":"语音入口","copyKey":"profile_voice_entry","content":"语音介绍","enabled":true}
  ,{"group":"资料媒体","scene":"语音说明","copyKey":"profile_voice_notice","content":"用一段语音介绍真实的自己，提交后将进行审核","enabled":true}
  ,{"group":"资料媒体","scene":"开始录音","copyKey":"profile_voice_start_action","content":"开始录音","enabled":true}
  ,{"group":"资料媒体","scene":"停止录音","copyKey":"profile_voice_stop_action","content":"停止并上传","enabled":true}
  ,{"group":"资料媒体","scene":"删除语音","copyKey":"profile_voice_delete_action","content":"删除语音介绍","enabled":true}
  ,{"group":"资料媒体","scene":"录音时长","copyKey":"profile_voice_duration_notice","content":"录音时长范围","enabled":true}
  ,{"group":"资料媒体","scene":"录音过短","copyKey":"profile_voice_too_short","content":"录音时间太短，请重新录制","enabled":true}
  ,{"group":"资料媒体","scene":"上传规则","copyKey":"profile_upload_rule_notice","content":"上传要求","enabled":true}
  ,{"group":"准入首页","scene":"主标题一","copyKey":"home_completion_heading_line1","content":"完善资料和认证","enabled":true}
  ,{"group":"准入首页","scene":"主标题二","copyKey":"home_completion_heading_line2","content":"解锁更多专属权益","enabled":true}
  ,{"group":"准入首页","scene":"说明","copyKey":"home_completion_notice","content":"资料越完整，系统越能推荐适合你的用户","enabled":true}
  ,{"group":"准入首页","scene":"完善资料","copyKey":"home_complete_profile_action","content":"继续完善资料","enabled":true}
  ,{"group":"准入首页","scene":"完成认证","copyKey":"home_complete_verification_action","content":"继续完成认证","enabled":true}
  ,{"group":"准入首页","scene":"稍后操作","copyKey":"home_later_action","content":"稍后再说","enabled":true}
  ,{"group":"准入首页","scene":"受限提示","copyKey":"home_completion_later_notice","content":"完成资料与认证后可使用更多功能","enabled":true}
  ,{"group":"个人中心","scene":"默认昵称","copyKey":"profile_default_nickname","content":"待完善昵称","enabled":true}
  ,{"group":"个人中心","scene":"年龄单位","copyKey":"profile_age_suffix","content":"岁","enabled":true}
  ,{"group":"个人中心","scene":"我喜欢的","copyKey":"profile_stats_liked","content":"我喜欢的","enabled":true}
  ,{"group":"个人中心","scene":"喜欢我的","copyKey":"profile_stats_be_liked","content":"喜欢我的","enabled":true}
  ,{"group":"个人中心","scene":"最近来访","copyKey":"profile_stats_visitors","content":"最近来访","enabled":true}
  ,{"group":"个人中心","scene":"提升人气","copyKey":"profile_boost_action","content":"提升人气","enabled":true}
  ,{"group":"功能提示","scene":"邀请好友","copyKey":"feature_invite_pending","content":"邀请好友功能即将开放","enabled":true}
  ,{"group":"功能提示","scene":"我的动态","copyKey":"feature_posts_pending","content":"我的动态功能即将开放","enabled":true}
  ,{"group":"功能提示","scene":"帮助客服","copyKey":"feature_help_pending","content":"帮助与客服功能即将开放","enabled":true}
  ,{"group":"功能提示","scene":"设置","copyKey":"feature_settings_pending","content":"设置功能即将开放","enabled":true}
]}';

UPDATE app_config AS target
SET config_value = JSON_SET(
        COALESCE(target.config_value, JSON_OBJECT()),
        '$.rows',
        JSON_MERGE_PRESERVE(
            COALESCE(JSON_EXTRACT(target.config_value, '$.rows'), JSON_ARRAY()),
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_EXTRACT(@prd01_mobile_copy_defaults, CONCAT('$.rows[', defaults_row.row_no - 1, ']'))
                )
                FROM JSON_TABLE(
                    @prd01_mobile_copy_defaults,
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
WHERE target.config_key = 'prd01.copy.rules';

SET @prd01_mobile_copy_defaults = NULL;
