-- =============================================================
-- 回滚 069：恢复 2026-08-08 生产迁移前的表排序规则基线
-- 基线：96 张表为 utf8mb4_0900_ai_ci；以下 5 张表为 utf8mb4_unicode_ci：
-- app_whisper、ct_ideal_filter_snapshot、ct_ideal_snapshot_candidate、
-- ct_recommend_preference、ct_recommend_view_log。
-- 数据库默认规则迁移前已经是 utf8mb4_unicode_ci，因此保持不变。
-- =============================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @previous_foreign_key_checks := @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- MySQL 不支持通过 PREPARE 执行 ALTER DATABASE；省略库名时作用于当前数据库。
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS spacetime_rollback_database_collation;

DELIMITER $$

CREATE PROCEDURE spacetime_rollback_database_collation()
rollback_main: BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE target_table VARCHAR(255);
    DECLARE target_collation VARCHAR(64);

    DECLARE table_cursor CURSOR FOR
        SELECT target.TABLE_NAME
          FROM information_schema.TABLES target
         WHERE target.TABLE_SCHEMA = DATABASE()
           AND target.TABLE_TYPE = 'BASE TABLE'
         ORDER BY target.TABLE_NAME;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET FOREIGN_KEY_CHECKS = @previous_foreign_key_checks;
        RESIGNAL;
    END;

    OPEN table_cursor;
    table_loop: LOOP
        FETCH table_cursor INTO target_table;
        IF done = 1 THEN
            LEAVE table_loop;
        END IF;

        SET target_collation = IF(
            target_table IN (
                'app_whisper',
                'ct_ideal_filter_snapshot',
                'ct_ideal_snapshot_candidate',
                'ct_recommend_preference',
                'ct_recommend_view_log'
            ),
            'utf8mb4_unicode_ci',
            'utf8mb4_0900_ai_ci'
        );
        SET @alter_table_sql = CONCAT(
            'ALTER TABLE `', REPLACE(target_table, '`', '``'),
            '` CONVERT TO CHARACTER SET utf8mb4 COLLATE ', target_collation
        );
        PREPARE rollback_table_stmt FROM @alter_table_sql;
        EXECUTE rollback_table_stmt;
        DEALLOCATE PREPARE rollback_table_stmt;
    END LOOP;
    CLOSE table_cursor;
END $$

DELIMITER ;

CALL spacetime_rollback_database_collation();
DROP PROCEDURE IF EXISTS spacetime_rollback_database_collation;

SET FOREIGN_KEY_CHECKS = @previous_foreign_key_checks;
