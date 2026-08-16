-- PRD-03：记录 TIM 账号最近一次同步成功所属的 SDKAppID。
-- 存量数据保持 NULL，由账号凭证或会话详情首次访问时重新导入当前 TIM 应用后回填。

DROP PROCEDURE IF EXISTS prd03_add_im_account_sdk_app_id;

DELIMITER $$

CREATE PROCEDURE prd03_add_im_account_sdk_app_id()
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'app_user_im_account'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'app_user_im_account'
           AND COLUMN_NAME = 'sdk_app_id'
    ) THEN
        ALTER TABLE `app_user_im_account`
            ADD COLUMN `sdk_app_id` BIGINT NULL
            COMMENT '最近一次同步成功所属的腾讯云TIM SDKAppID'
            AFTER `im_user_id`;
    END IF;
END $$

DELIMITER ;

CALL prd03_add_im_account_sdk_app_id();

DROP PROCEDURE IF EXISTS prd03_add_im_account_sdk_app_id;
