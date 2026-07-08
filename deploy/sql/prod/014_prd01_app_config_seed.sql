-- ======================================================
-- PRD-01 准入与资料认证初始化默认配置
-- 说明：后台准入配置页与移动端 /miniapp/config/prd01 共用 app_config。
-- ======================================================

INSERT INTO app_config (config_key, config_value, config_group, config_type, public_visible, status, remark)
VALUES
('prd01.access.requireRealName', 'true', 'PRD01_ACCESS', 'BOOLEAN', 0, 'ENABLED', '必须实名通过'),
('prd01.access.requireAvatar', 'true', 'PRD01_ACCESS', 'BOOLEAN', 0, 'ENABLED', '必须头像通过'),
('prd01.access.requireEducation', 'true', 'PRD01_ACCESS', 'BOOLEAN', 0, 'ENABLED', '必须学历通过'),
('prd01.access.minProfileScore', '80', 'PRD01_ACCESS', 'NUMBER', 0, 'ENABLED', '资料完整度最低分'),
('prd01.profile.requireAboutMe', 'true', 'PRD01_PROFILE_FIELD', 'BOOLEAN', 0, 'ENABLED', '关于我必填'),
('prd01.profile.requireHopeTheyKnow', 'true', 'PRD01_PROFILE_FIELD', 'BOOLEAN', 0, 'ENABLED', '希望 TA 了解必填'),
('prd01.profile.requireQaCount', '3', 'PRD01_PROFILE_FIELD', 'NUMBER', 0, 'ENABLED', '资料问答最少条数'),
('prd01.profile.allowOverseasRegion', 'false', 'PRD01_PROFILE_FIELD', 'BOOLEAN', 0, 'ENABLED', '现居地/家乡不支持海外国家'),
('prd01.upload.avatar.max_mb', '5', 'PRD01_UPLOAD', 'NUMBER', 0, 'ENABLED', '头像最大 MB'),
('prd01.upload.album.max_count', '6', 'PRD01_UPLOAD', 'NUMBER', 0, 'ENABLED', '相册最多张数'),
('prd01.upload.voice.min_duration', '10', 'PRD01_UPLOAD', 'NUMBER', 0, 'ENABLED', '语音介绍最短秒数'),
('prd01.upload.voice.max_duration', '60', 'PRD01_UPLOAD', 'NUMBER', 0, 'ENABLED', '语音介绍最长秒数'),
('prd01.audit.voice.provider', 'MOCK', 'PRD01_AUDIT', 'TEXT', 0, 'ENABLED', '语音 Provider 首版 mock 成功'),
('prd01.audit.text.provider', 'MOCK', 'PRD01_AUDIT', 'TEXT', 0, 'ENABLED', '文字 Provider 首版 mock 成功'),
('prd01.audit.open_text.types', 'ABOUT_ME,HOPE_THEY_KNOW,PROFILE_QA', 'PRD01_AUDIT', 'TEXT', 0, 'ENABLED', '开放性文字审核类型'),
('prd01.audit.show_source', 'true', 'PRD01_AUDIT', 'BOOLEAN', 0, 'ENABLED', '审核来源筛选与列表展示')
ON DUPLICATE KEY UPDATE
    config_value = VALUES(config_value),
    config_group = VALUES(config_group),
    config_type = VALUES(config_type),
    public_visible = VALUES(public_visible),
    status = VALUES(status),
    remark = VALUES(remark),
    update_time = CURRENT_TIMESTAMP,
    deleted = 0;
