-- 一次性推荐额度重置；只定位被授权的单账号，不输出手机号或候选资料。
-- 与服务端保持同一北京时间中午周期、view 去重统计及用户行锁。
-- 原记录留在备份表，执行标记防止重跑再次清空用户的新浏览。
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ops_recommend_reset_log (
    operation_key VARCHAR(96) NOT NULL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    summary_json JSON NOT NULL,
    executed_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ops_bak_20261010_recommend_views LIKE ct_recommend_view_log;

DROP PROCEDURE IF EXISTS spacetime_ops_reset_recommend_20261010;
DELIMITER $$
CREATE PROCEDURE spacetime_ops_reset_recommend_20261010()
reset_main: BEGIN
    DECLARE v_operation_key VARCHAR(96) DEFAULT 'recommend_reset_20261010_account_a27e58';
    DECLARE v_target_hash CHAR(64) DEFAULT 'a27e5899573ad6b7e16f4778a8d453ea3f7faae700d48368875f48f2f244d56a';
    DECLARE v_user_count INT DEFAULT 0;
    DECLARE v_user_id BIGINT DEFAULT NULL;
    DECLARE v_locked_id BIGINT DEFAULT NULL;
    DECLARE v_now DATETIME;
    DECLARE v_cycle_start DATETIME;
    DECLARE v_cycle_end DATETIME;
    DECLARE v_vip_effective BOOLEAN DEFAULT FALSE;
    DECLARE v_config_key VARCHAR(64);
    DECLARE v_config_count INT DEFAULT 0;
    DECLARE v_config_value VARCHAR(255) DEFAULT NULL;
    DECLARE v_quota INT DEFAULT 10;
    DECLARE v_view_rows BIGINT DEFAULT 0;
    DECLARE v_used BIGINT DEFAULT 0;
    DECLARE v_removed BIGINT DEFAULT 0;
    DECLARE v_remaining BIGINT DEFAULT 0;
    DECLARE v_summary JSON;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT COUNT(*), MIN(id) INTO v_user_count, v_user_id
      FROM app_user
     WHERE (phone_hash = v_target_hash OR SHA2(TRIM(phone), 256) = v_target_hash)
       AND deleted = 0;
    IF v_user_count <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target account must match exactly one active user';
    END IF;

    START TRANSACTION;
    -- 与 recordAction(view) 使用同一锁，锁定后才建立普通读取快照。
    SELECT id INTO v_locked_id FROM app_user
     WHERE id = v_user_id AND deleted = 0 FOR UPDATE;
    IF v_locked_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Target account disappeared before locking';
    END IF;

    IF EXISTS (SELECT 1 FROM ops_recommend_reset_log WHERE operation_key = v_operation_key) THEN
        SELECT summary_json INTO v_summary FROM ops_recommend_reset_log
         WHERE operation_key = v_operation_key;
        COMMIT;
        SELECT 'already_completed' AS operation_status, v_summary AS summary_json;
        LEAVE reset_main;
    END IF;

    SET v_now = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR);
    SET v_cycle_start = TIMESTAMP(DATE(v_now), '12:00:00');
    IF v_now < v_cycle_start THEN
        SET v_cycle_start = DATE_SUB(v_cycle_start, INTERVAL 1 DAY);
    END IF;
    SET v_cycle_end = DATE_ADD(v_cycle_start, INTERVAL 1 DAY);
    SELECT EXISTS (
        SELECT 1 FROM app_user_asset WHERE user_id = v_user_id AND deleted = 0
         AND vip_status = 'active' AND (vip_expire_time IS NULL OR vip_expire_time > v_now)
    ) INTO v_vip_effective;
    SET v_quota = IF(v_vip_effective, 20, 10);
    SET v_config_key = IF(v_vip_effective, 'commercial.view.quota.vip', 'commercial.view.quota.normal');
    SELECT COUNT(*), MAX(config_value) INTO v_config_count, v_config_value
      FROM app_config WHERE config_key = v_config_key AND deleted = 0;
    IF v_config_count > 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Browse quota configuration is not unique';
    END IF;
    IF v_config_value IS NOT NULL THEN
        IF v_config_value NOT REGEXP '^[+-]?[0-9]+$'
           OR CAST(v_config_value AS DECIMAL(65,0)) NOT BETWEEN -2147483648 AND 2147483647 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid browse quota configuration; reset stopped';
        END IF;
        SET v_quota = GREATEST(0, CAST(v_config_value AS SIGNED));
    END IF;

    SELECT COUNT(*), COUNT(DISTINCT candidate_user_id) INTO v_view_rows, v_used
      FROM ct_recommend_view_log WHERE user_id = v_user_id AND action = 'view' AND deleted = 0
       AND viewed_at >= v_cycle_start AND viewed_at < v_cycle_end;

    INSERT INTO ops_bak_20261010_recommend_views
    SELECT * FROM ct_recommend_view_log WHERE user_id = v_user_id AND action = 'view' AND deleted = 0
       AND viewed_at >= v_cycle_start AND viewed_at < v_cycle_end;
    IF ROW_COUNT() <> v_view_rows THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Browse backup count mismatch';
    END IF;

    DELETE FROM ct_recommend_view_log WHERE user_id = v_user_id AND action = 'view' AND deleted = 0
       AND viewed_at >= v_cycle_start AND viewed_at < v_cycle_end;
    SET v_removed = ROW_COUNT();
    SELECT COUNT(*) INTO v_remaining FROM ct_recommend_view_log
     WHERE user_id = v_user_id AND action = 'view' AND deleted = 0
       AND viewed_at >= v_cycle_start AND viewed_at < v_cycle_end;
    IF v_removed <> v_view_rows OR v_remaining <> 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Browse reset verification failed';
    END IF;

    SET v_summary = JSON_OBJECT(
        'cycle_start', v_cycle_start, 'next_reset_at', v_cycle_end,
        'vip_effective', v_vip_effective, 'browse_quota', v_quota,
        'before_view_rows', v_view_rows, 'before_unique_candidates', v_used,
        'before_remaining', GREATEST(0, v_quota - v_used),
        'removed_view_rows', v_removed, 'remaining_view_rows', v_remaining,
        'restored_remaining', v_quota
    );
    INSERT INTO ops_recommend_reset_log (operation_key, user_id, summary_json, executed_at)
    VALUES (v_operation_key, v_user_id, v_summary, v_now);
    COMMIT;
    SELECT 'completed' AS operation_status, v_summary AS summary_json;
END$$
DELIMITER ;
CALL spacetime_ops_reset_recommend_20261010();
DROP PROCEDURE IF EXISTS spacetime_ops_reset_recommend_20261010;
