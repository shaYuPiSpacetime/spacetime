-- 推荐偏好：记录“仅认证用户可与我交友”开关；不改变平台现有认证准入要求。
DROP PROCEDURE IF EXISTS spacetime_add_recommend_certified_preference;
DELIMITER $$
CREATE PROCEDURE spacetime_add_recommend_certified_preference()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'ct_recommend_preference'
           AND column_name = 'only_certified_users'
    ) THEN
        ALTER TABLE ct_recommend_preference
            ADD COLUMN only_certified_users TINYINT(1) NOT NULL DEFAULT 0
            COMMENT '仅认证用户可与我交友：0-关闭，1-开启';
    END IF;
END$$
DELIMITER ;
CALL spacetime_add_recommend_certified_preference();
DROP PROCEDURE IF EXISTS spacetime_add_recommend_certified_preference;
