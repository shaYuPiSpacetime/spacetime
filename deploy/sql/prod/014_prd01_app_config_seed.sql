-- ======================================================
-- PRD-01 准入与资料认证初始化默认配置
-- 说明：后台准入配置页与移动端 /miniapp/config/prd01 共用 app_config。
-- ======================================================

UPDATE app_config
SET deleted = 1,
    status = 'DISABLED',
    update_time = CURRENT_TIMESTAMP
WHERE deleted = 0
  AND config_key IN (
      'prd01.access.requireRealName',
      'prd01.access.requireAvatar',
      'prd01.access.requireEducation',
      'prd01.access.minProfileScore',
      'prd01.profile.requireAboutMe',
      'prd01.profile.requireHopeTheyKnow',
      'prd01.profile.requireQaCount',
      'prd01.profile.allowOverseasRegion',
      'prd01.upload.avatar.max_mb',
      'prd01.upload.album.max_count',
      'prd01.upload.voice.min_duration',
      'prd01.upload.voice.max_duration',
      'prd01.audit.voice.provider',
      'prd01.audit.text.provider',
      'prd01.audit.open_text.types',
      'prd01.audit.show_source'
  );

INSERT INTO app_config (config_key, config_value, config_group, config_type, public_visible, status, remark)
VALUES
('prd01.access.minAge', '18', 'PRD01_ACCESS', 'NUMBER', 0, 'ENABLED', '最小年龄'),
('prd01.access.maxAge', '60', 'PRD01_ACCESS', 'NUMBER', 0, 'ENABLED', '最大年龄'),
('prd01.profile.fieldSettings', '{"rows":[]}', 'PRD01_PROFILE_FIELD', 'JSON', 0, 'ENABLED', '字段展示、必填、计分配置'),
('prd01.profile.scoreWeights', '{"rows":[]}', 'PRD01_PROFILE_FIELD', 'JSON', 0, 'ENABLED', '资料完整度分值配置'),
('prd01.upload.rules', '{"rows":[{"key":"education","title":"学历材料","maxCount":"4","maxMb":"10","format":"jpg / jpeg / png"},{"key":"album","title":"相册照片","maxCount":"6","maxMb":"10","format":"jpg / jpeg / png"},{"key":"profileBg","title":"资料背景图","maxCount":"1","maxMb":"10","format":"jpg / jpeg / png"}]}', 'PRD01_UPLOAD', 'JSON', 0, 'ENABLED', '上传限制配置'),
('prd01.audit.education.sla_hours', '24', 'PRD01_AUDIT', 'NUMBER', 0, 'ENABLED', '学历审核承诺时间（小时）'),
('prd01.copy.rules', '{"rows":[]}', 'PRD01_AUDIT', 'JSON', 0, 'ENABLED', '准入/认证文案配置'),
('prd01.text.length.rules', '{"rows":[]}', 'PRD01_AUDIT', 'JSON', 0, 'ENABLED', '开放文本长度文案配置'),
('prd01.security.sms.rules', '{"rows":[{"key":"sendCountdownSeconds","label":"发送倒计时","value":"60","unit":"秒","description":"同一个用户发送短信验证码后的倒计时"},{"key":"validMinutes","label":"有效期","value":"5","unit":"分钟","description":"短信验证码有效期"},{"key":"dailySendLimit","label":"每日上限","value":"10","unit":"次","description":"每日发送上限"}]}', 'PRD01_AUDIT', 'JSON', 0, 'ENABLED', '短信验证码安全策略')
ON DUPLICATE KEY UPDATE
    config_value = VALUES(config_value),
    config_group = VALUES(config_group),
    config_type = VALUES(config_type),
    public_visible = VALUES(public_visible),
    status = VALUES(status),
    remark = VALUES(remark),
    update_time = CURRENT_TIMESTAMP,
    deleted = 0;
