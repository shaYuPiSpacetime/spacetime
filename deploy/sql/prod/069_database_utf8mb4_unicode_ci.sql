-- =============================================================
-- 生产数据库字符集与排序规则全量统一
-- 目标：数据库默认规则、全部基础表和全部字符列统一为 utf8mb4_unicode_ci。
-- 说明：
-- 1. 只转换仍存在非目标排序规则的基础表，可重复执行。
-- 2. ALTER TABLE 会隐式提交；执行前必须完成生产全量逻辑备份。
-- 3. 执行期间临时关闭外键检查，完成或异常时恢复调用前状态。
-- =============================================================

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @previous_foreign_key_checks := @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- MySQL 不支持通过 PREPARE 执行 ALTER DATABASE；省略库名时作用于当前数据库。
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS spacetime_normalize_database_collation;

DELIMITER $$

CREATE PROCEDURE spacetime_normalize_database_collation()
normalize_main: BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE target_table VARCHAR(255);

    DECLARE table_cursor CURSOR FOR
        SELECT DISTINCT target.TABLE_NAME
          FROM information_schema.TABLES target
         WHERE target.TABLE_SCHEMA = DATABASE()
           AND target.TABLE_TYPE = 'BASE TABLE'
           AND (
               target.TABLE_COLLATION <> 'utf8mb4_unicode_ci'
               OR EXISTS (
                   SELECT 1
                     FROM information_schema.COLUMNS target_column
                    WHERE target_column.TABLE_SCHEMA = target.TABLE_SCHEMA
                      AND target_column.TABLE_NAME = target.TABLE_NAME
                      AND target_column.CHARACTER_SET_NAME IS NOT NULL
                      AND target_column.COLLATION_NAME <> 'utf8mb4_unicode_ci'
               )
           )
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

        SET @alter_table_sql = CONCAT(
            'ALTER TABLE `', REPLACE(target_table, '`', '``'),
            '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
        );
        PREPARE normalize_table_stmt FROM @alter_table_sql;
        EXECUTE normalize_table_stmt;
        DEALLOCATE PREPARE normalize_table_stmt;
    END LOOP;
    CLOSE table_cursor;
END $$

DELIMITER ;

CALL spacetime_normalize_database_collation();
DROP PROCEDURE IF EXISTS spacetime_normalize_database_collation;

SET FOREIGN_KEY_CHECKS = @previous_foreign_key_checks;
