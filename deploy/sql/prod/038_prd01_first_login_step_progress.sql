-- PRD01 首登五步流程进度。
-- 选填字段可以空值继续，因此不能再通过资料字段是否为空推断用户是否走过该步骤。
ALTER TABLE `app_user`
    ADD COLUMN IF NOT EXISTS `first_login_next_step` TINYINT DEFAULT 1
        COMMENT '首登下一待填写步骤，完成后为空'
        AFTER `first_login_completed`;

UPDATE `app_user`
SET `first_login_next_step` = CASE
    WHEN `first_login_completed` = 1 THEN NULL
    ELSE COALESCE(`first_login_next_step`, 1)
END;
