-- ======================================================
-- PRD-01 认证汇总表补充内容审核来源字段
-- 说明：011 已落库环境中，资料照片/开放性文字汇总状态缺少 audit_source 字段，本脚本单独补齐。
-- ======================================================

ALTER TABLE app_user_verification
    ADD COLUMN profile_photo_audit_source VARCHAR(20) NOT NULL DEFAULT 'MACHINE' COMMENT '资料照片审核来源：MACHINE/MANUAL';

ALTER TABLE app_user_verification
    ADD COLUMN open_text_audit_source VARCHAR(20) NOT NULL DEFAULT 'MACHINE' COMMENT '开放性文字审核来源：MACHINE/MANUAL';
