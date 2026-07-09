-- PRD-01 统一审核表上线后，旧审核快照/分表退场。
-- 这些表不再作为代码事实来源；执行前需确认环境已经完成 app_user_audit_record / app_user_audit_history 迁移。

DROP TABLE IF EXISTS app_user_verification_record;
DROP TABLE IF EXISTS app_user_voice_intro_record;
DROP TABLE IF EXISTS app_user_open_text_audit;
DROP TABLE IF EXISTS app_user_profile_media;
DROP TABLE IF EXISTS app_user_verification;
