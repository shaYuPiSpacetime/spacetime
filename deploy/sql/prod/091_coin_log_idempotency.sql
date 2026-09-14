-- 千寻币流水退款补偿幂等兜底。
-- 可重复执行：保证业务幂等键列和对应唯一索引均存在且定义正确。

DROP PROCEDURE IF EXISTS spacetime_ensure_coin_log_idempotency;
DELIMITER $$
CREATE PROCEDURE spacetime_ensure_coin_log_idempotency()
BEGIN
    DECLARE v_table_exists INT DEFAULT 0;
    DECLARE v_index_exists INT DEFAULT 0;
    DECLARE v_index_valid INT DEFAULT 0;

    SELECT COUNT(*) INTO v_table_exists
      FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = 'app_user_coin_log';

    IF v_table_exists = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'app_user_coin_log does not exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'app_user_coin_log'
           AND column_name = 'biz_idempotency_key'
    ) THEN
        ALTER TABLE app_user_coin_log
            ADD COLUMN biz_idempotency_key VARCHAR(160) DEFAULT NULL COMMENT '业务幂等键';
    END IF;

    SELECT COUNT(*) INTO v_index_exists
      FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = 'app_user_coin_log'
       AND index_name = 'uk_coin_biz_idempotency';

    SELECT CASE
               WHEN COUNT(*) = 1
                    AND MIN(non_unique) = 0
                    AND MIN(seq_in_index) = 1
                    AND MIN(column_name) = 'biz_idempotency_key'
               THEN 1 ELSE 0
           END INTO v_index_valid
      FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = 'app_user_coin_log'
       AND index_name = 'uk_coin_biz_idempotency';

    IF v_index_exists > 0 AND v_index_valid = 0 THEN
        ALTER TABLE app_user_coin_log DROP INDEX uk_coin_biz_idempotency;
    END IF;

    IF v_index_valid = 0 THEN
        -- NULL 不参与唯一性冲突；先规范历史空值，再只保留最早一条重复幂等键。
        UPDATE app_user_coin_log
           SET biz_idempotency_key = NULL
         WHERE biz_idempotency_key IS NOT NULL
           AND TRIM(biz_idempotency_key) = '';

        UPDATE app_user_coin_log newer
        JOIN app_user_coin_log older
          ON older.biz_idempotency_key = newer.biz_idempotency_key
         AND older.id < newer.id
           SET newer.biz_idempotency_key = NULL
         WHERE newer.biz_idempotency_key IS NOT NULL;

        ALTER TABLE app_user_coin_log
            ADD UNIQUE KEY uk_coin_biz_idempotency (biz_idempotency_key);
    END IF;
END$$
DELIMITER ;

CALL spacetime_ensure_coin_log_idempotency();
DROP PROCEDURE spacetime_ensure_coin_log_idempotency;
