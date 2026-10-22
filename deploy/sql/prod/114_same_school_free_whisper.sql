-- 同校免费悄悄话：增加学校主体归一编码及发送事实快照。
-- 可重复执行；仅补字段并为存量学校建立一对一默认映射，不修改悄悄话业务状态或资产。

DROP PROCEDURE IF EXISTS add_same_school_free_whisper_columns;
DELIMITER $$
CREATE PROCEDURE add_same_school_free_whisper_columns()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'school_dictionary'
          AND COLUMN_NAME = 'canonical_school_code'
    ) THEN
        ALTER TABLE school_dictionary
            ADD COLUMN canonical_school_code VARCHAR(64) NULL
            COMMENT '归一学校编码；校区和历史编码可映射至同一学校主体'
            AFTER school_code;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'app_message_whisper'
          AND COLUMN_NAME = 'school_code_snapshot'
    ) THEN
        ALTER TABLE app_message_whisper
            ADD COLUMN school_code_snapshot VARCHAR(64) NULL
            COMMENT '同校免费发送时的归一学校编码快照'
            AFTER quota_snapshot;
    END IF;
END $$
DELIMITER ;

CALL add_same_school_free_whisper_columns();
DROP PROCEDURE IF EXISTS add_same_school_free_whisper_columns;

UPDATE school_dictionary
SET canonical_school_code = COALESCE(NULLIF(TRIM(school_code), ''), TRIM(provider_uuid)),
    update_time = CURRENT_TIMESTAMP
WHERE deleted = 0
  AND (canonical_school_code IS NULL OR TRIM(canonical_school_code) = '');
