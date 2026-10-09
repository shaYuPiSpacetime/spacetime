-- 一次性生产运维：重置指定两个 App 用户之间的关系和消息链路。
-- 仅使用手机号 SHA-256 定位账号，不在仓库或日志中保存手机号明文。
-- 所有待删除行先复制到 ops_bak_20261009_* 表；执行标记保证重复运行不会再次清理。

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ops_data_reset_log` (
    `operation_key` VARCHAR(96) NOT NULL,
    `user_low_id` BIGINT NOT NULL,
    `user_high_id` BIGINT NOT NULL,
    `summary_json` JSON NULL,
    `executed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`operation_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='一次性生产数据重置执行记录';

DROP PROCEDURE IF EXISTS `spacetime_ops_reset_relation_pair_20261009`;

DELIMITER $$

CREATE PROCEDURE `spacetime_ops_reset_relation_pair_20261009`()
reset_main: BEGIN
    DECLARE v_operation_key VARCHAR(96) DEFAULT 'reset_relation_pair_20261009_187_158';
    DECLARE v_user_a_count INT DEFAULT 0;
    DECLARE v_user_b_count INT DEFAULT 0;
    DECLARE v_user_a BIGINT DEFAULT NULL;
    DECLARE v_user_b BIGINT DEFAULT NULL;
    DECLARE v_user_low BIGINT DEFAULT NULL;
    DECLARE v_user_high BIGINT DEFAULT NULL;
    DECLARE v_like_count BIGINT DEFAULT 0;
    DECLARE v_match_count BIGINT DEFAULT 0;
    DECLARE v_whisper_count BIGINT DEFAULT 0;
    DECLARE v_legacy_whisper_count BIGINT DEFAULT 0;
    DECLARE v_conversation_count BIGINT DEFAULT 0;
    DECLARE v_message_count BIGINT DEFAULT 0;
    DECLARE v_remaining_count BIGINT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF EXISTS (
        SELECT 1 FROM ops_data_reset_log WHERE operation_key = v_operation_key
    ) THEN
        SELECT 'already_completed' AS operation_status, operation_key,
               user_low_id, user_high_id, summary_json, executed_at
          FROM ops_data_reset_log
         WHERE operation_key = v_operation_key;
        LEAVE reset_main;
    END IF;

    SELECT COUNT(*), MIN(id)
      INTO v_user_a_count, v_user_a
      FROM app_user
     WHERE (phone_hash = '7e7cec43af79a11df99961fe293afd5ffd9443c8fd8b9b834b407077c07ea75b'
            OR SHA2(TRIM(phone), 256) = '7e7cec43af79a11df99961fe293afd5ffd9443c8fd8b9b834b407077c07ea75b')
       AND deleted = 0;

    SELECT COUNT(*), MIN(id)
      INTO v_user_b_count, v_user_b
      FROM app_user
     WHERE (phone_hash = 'c4f16443ddb0f58366897703027b59fd40354fb60c01e8f1c5d51a609b59978e'
            OR SHA2(TRIM(phone), 256) = 'c4f16443ddb0f58366897703027b59fd40354fb60c01e8f1c5d51a609b59978e')
       AND deleted = 0;

    IF v_user_a_count <> 1 OR v_user_b_count <> 1 OR v_user_a = v_user_b THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '目标账号未唯一命中或账号相同，已停止双账号关系清理';
    END IF;

    SET v_user_low = LEAST(v_user_a, v_user_b);
    SET v_user_high = GREATEST(v_user_a, v_user_b);

    DROP TEMPORARY TABLE IF EXISTS tmp_ops_pair_matches;
    CREATE TEMPORARY TABLE tmp_ops_pair_matches (
        id BIGINT NOT NULL PRIMARY KEY,
        biz_no VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB;
    INSERT INTO tmp_ops_pair_matches (id, biz_no)
    SELECT id, match_no
      FROM app_relation_match
     WHERE user_low_id = v_user_low AND user_high_id = v_user_high;

    DROP TEMPORARY TABLE IF EXISTS tmp_ops_pair_conversations;
    CREATE TEMPORARY TABLE tmp_ops_pair_conversations (
        id BIGINT NOT NULL PRIMARY KEY,
        biz_no VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB;
    INSERT INTO tmp_ops_pair_conversations (id, biz_no)
    SELECT id, conversation_no
      FROM app_message_conversation
     WHERE (user_low_id = v_user_low AND user_high_id = v_user_high)
        OR match_id IN (SELECT id FROM tmp_ops_pair_matches);

    DROP TEMPORARY TABLE IF EXISTS tmp_ops_pair_whispers;
    CREATE TEMPORARY TABLE tmp_ops_pair_whispers (
        id BIGINT NOT NULL PRIMARY KEY,
        biz_no VARCHAR(64) NOT NULL,
        request_message_id BIGINT NULL,
        reply_message_id BIGINT NULL
    ) ENGINE=InnoDB;
    INSERT INTO tmp_ops_pair_whispers (id, biz_no, request_message_id, reply_message_id)
    SELECT id, whisper_no, request_message_id, reply_message_id
      FROM app_message_whisper
     WHERE user_low_id = v_user_low AND user_high_id = v_user_high;

    DROP TEMPORARY TABLE IF EXISTS tmp_ops_pair_messages;
    CREATE TEMPORARY TABLE tmp_ops_pair_messages (
        id BIGINT NOT NULL PRIMARY KEY,
        biz_no VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB;
    INSERT IGNORE INTO tmp_ops_pair_messages (id, biz_no)
    SELECT id, message_no
      FROM app_message_record
     WHERE (sender_user_id = v_user_a AND receiver_user_id = v_user_b)
        OR (sender_user_id = v_user_b AND receiver_user_id = v_user_a)
        OR conversation_id IN (SELECT id FROM tmp_ops_pair_conversations)
        OR id IN (
            SELECT request_message_id FROM tmp_ops_pair_whispers WHERE request_message_id IS NOT NULL
            UNION
            SELECT reply_message_id FROM tmp_ops_pair_whispers WHERE reply_message_id IS NOT NULL
        );

    SELECT COUNT(*) INTO v_like_count
      FROM app_relation_like
     WHERE (from_user_id = v_user_a AND to_user_id = v_user_b)
        OR (from_user_id = v_user_b AND to_user_id = v_user_a);
    SELECT COUNT(*) INTO v_match_count FROM tmp_ops_pair_matches;
    SELECT COUNT(*) INTO v_whisper_count FROM tmp_ops_pair_whispers;
    SELECT COUNT(*) INTO v_legacy_whisper_count
      FROM app_whisper
     WHERE (sender_user_id = v_user_a AND receiver_user_id = v_user_b)
        OR (sender_user_id = v_user_b AND receiver_user_id = v_user_a);
    SELECT COUNT(*) INTO v_conversation_count FROM tmp_ops_pair_conversations;
    SELECT COUNT(*) INTO v_message_count FROM tmp_ops_pair_messages;

    CREATE TABLE IF NOT EXISTS ops_bak_20261009_relation_like LIKE app_relation_like;
    CREATE TABLE IF NOT EXISTS ops_bak_20261009_relation_match LIKE app_relation_match;
    CREATE TABLE IF NOT EXISTS ops_bak_20261009_match_source LIKE app_relation_match_source;
    CREATE TABLE IF NOT EXISTS ops_bak_20261009_match_popup LIKE app_relation_match_popup;
    CREATE TABLE IF NOT EXISTS ops_bak_20261009_conversation LIKE app_message_conversation;
    CREATE TABLE IF NOT EXISTS ops_bak_20261009_conversation_member LIKE app_message_conversation_member;
    CREATE TABLE IF NOT EXISTS ops_bak_20261009_message_record LIKE app_message_record;
    CREATE TABLE IF NOT EXISTS ops_bak_20261009_message_whisper LIKE app_message_whisper;
    CREATE TABLE IF NOT EXISTS ops_bak_20261009_legacy_whisper LIKE app_whisper;
    CREATE TABLE IF NOT EXISTS ops_bak_20261009_delivery_outbox LIKE app_message_delivery_outbox;
    CREATE TABLE IF NOT EXISTS ops_bak_20261009_event_inbox LIKE app_message_event_inbox;

    INSERT IGNORE INTO ops_bak_20261009_relation_like
    SELECT * FROM app_relation_like
     WHERE (from_user_id = v_user_a AND to_user_id = v_user_b)
        OR (from_user_id = v_user_b AND to_user_id = v_user_a);
    INSERT IGNORE INTO ops_bak_20261009_relation_match
    SELECT * FROM app_relation_match WHERE id IN (SELECT id FROM tmp_ops_pair_matches);
    INSERT IGNORE INTO ops_bak_20261009_match_source
    SELECT * FROM app_relation_match_source WHERE match_id IN (SELECT id FROM tmp_ops_pair_matches);
    INSERT IGNORE INTO ops_bak_20261009_match_popup
    SELECT * FROM app_relation_match_popup WHERE match_id IN (SELECT id FROM tmp_ops_pair_matches);
    INSERT IGNORE INTO ops_bak_20261009_conversation
    SELECT * FROM app_message_conversation WHERE id IN (SELECT id FROM tmp_ops_pair_conversations);
    INSERT IGNORE INTO ops_bak_20261009_conversation_member
    SELECT * FROM app_message_conversation_member WHERE conversation_id IN (SELECT id FROM tmp_ops_pair_conversations);
    INSERT IGNORE INTO ops_bak_20261009_message_record
    SELECT * FROM app_message_record WHERE id IN (SELECT id FROM tmp_ops_pair_messages);
    INSERT IGNORE INTO ops_bak_20261009_message_whisper
    SELECT * FROM app_message_whisper WHERE id IN (SELECT id FROM tmp_ops_pair_whispers);
    INSERT IGNORE INTO ops_bak_20261009_legacy_whisper
    SELECT * FROM app_whisper
     WHERE (sender_user_id = v_user_a AND receiver_user_id = v_user_b)
        OR (sender_user_id = v_user_b AND receiver_user_id = v_user_a);
    INSERT IGNORE INTO ops_bak_20261009_delivery_outbox
    SELECT * FROM app_message_delivery_outbox
     WHERE (sender_user_id = v_user_a AND receiver_user_id = v_user_b)
        OR (sender_user_id = v_user_b AND receiver_user_id = v_user_a)
        OR (LOWER(aggregate_type) = 'message' AND aggregate_id IN (SELECT id FROM tmp_ops_pair_messages))
        OR (LOWER(aggregate_type) = 'whisper' AND aggregate_id IN (SELECT id FROM tmp_ops_pair_whispers));
    INSERT IGNORE INTO ops_bak_20261009_event_inbox
    SELECT * FROM app_message_event_inbox
     WHERE biz_no COLLATE utf8mb4_unicode_ci IN (SELECT biz_no FROM tmp_ops_pair_messages)
        OR biz_no COLLATE utf8mb4_unicode_ci IN (SELECT biz_no FROM tmp_ops_pair_whispers)
        OR biz_no COLLATE utf8mb4_unicode_ci IN (SELECT biz_no FROM tmp_ops_pair_conversations);

    START TRANSACTION;

    DELETE FROM app_message_delivery_outbox
     WHERE (sender_user_id = v_user_a AND receiver_user_id = v_user_b)
        OR (sender_user_id = v_user_b AND receiver_user_id = v_user_a)
        OR (LOWER(aggregate_type) = 'message' AND aggregate_id IN (SELECT id FROM tmp_ops_pair_messages))
        OR (LOWER(aggregate_type) = 'whisper' AND aggregate_id IN (SELECT id FROM tmp_ops_pair_whispers));
    DELETE FROM app_message_event_inbox
     WHERE biz_no COLLATE utf8mb4_unicode_ci IN (SELECT biz_no FROM tmp_ops_pair_messages)
        OR biz_no COLLATE utf8mb4_unicode_ci IN (SELECT biz_no FROM tmp_ops_pair_whispers)
        OR biz_no COLLATE utf8mb4_unicode_ci IN (SELECT biz_no FROM tmp_ops_pair_conversations);
    DELETE FROM app_message_conversation_member
     WHERE conversation_id IN (SELECT id FROM tmp_ops_pair_conversations);
    DELETE FROM app_message_whisper
     WHERE id IN (SELECT id FROM tmp_ops_pair_whispers);
    DELETE FROM app_message_record
     WHERE id IN (SELECT id FROM tmp_ops_pair_messages);
    DELETE FROM app_message_conversation
     WHERE id IN (SELECT id FROM tmp_ops_pair_conversations);
    DELETE FROM app_whisper
     WHERE (sender_user_id = v_user_a AND receiver_user_id = v_user_b)
        OR (sender_user_id = v_user_b AND receiver_user_id = v_user_a);
    DELETE FROM app_relation_match_popup
     WHERE match_id IN (SELECT id FROM tmp_ops_pair_matches);
    DELETE FROM app_relation_match_source
     WHERE match_id IN (SELECT id FROM tmp_ops_pair_matches);
    DELETE FROM app_relation_match
     WHERE id IN (SELECT id FROM tmp_ops_pair_matches);
    DELETE FROM app_relation_like
     WHERE (from_user_id = v_user_a AND to_user_id = v_user_b)
        OR (from_user_id = v_user_b AND to_user_id = v_user_a);

    SET v_remaining_count =
          (SELECT COUNT(*) FROM app_relation_like
            WHERE (from_user_id = v_user_a AND to_user_id = v_user_b)
               OR (from_user_id = v_user_b AND to_user_id = v_user_a))
        + (SELECT COUNT(*) FROM app_relation_match
            WHERE user_low_id = v_user_low AND user_high_id = v_user_high)
        + (SELECT COUNT(*) FROM app_message_whisper
            WHERE user_low_id = v_user_low AND user_high_id = v_user_high)
        + (SELECT COUNT(*) FROM app_message_conversation
            WHERE user_low_id = v_user_low AND user_high_id = v_user_high)
        + (SELECT COUNT(*) FROM app_message_record
            WHERE (sender_user_id = v_user_a AND receiver_user_id = v_user_b)
               OR (sender_user_id = v_user_b AND receiver_user_id = v_user_a)
               OR id IN (SELECT id FROM tmp_ops_pair_messages))
        + (SELECT COUNT(*) FROM app_whisper
            WHERE (sender_user_id = v_user_a AND receiver_user_id = v_user_b)
               OR (sender_user_id = v_user_b AND receiver_user_id = v_user_a));

    IF v_remaining_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '双账号关系清理后仍有关键数据残留，事务已回滚';
    END IF;

    INSERT INTO ops_data_reset_log (
        operation_key, user_low_id, user_high_id, summary_json, executed_at
    ) VALUES (
        v_operation_key,
        v_user_low,
        v_user_high,
        JSON_OBJECT(
            'likes', v_like_count,
            'matches', v_match_count,
            'whispers', v_whisper_count,
            'legacyWhispers', v_legacy_whisper_count,
            'conversations', v_conversation_count,
            'messages', v_message_count
        ),
        CURRENT_TIMESTAMP
    );

    COMMIT;

    SELECT 'completed' AS operation_status,
           v_user_low AS user_low_id,
           v_user_high AS user_high_id,
           v_like_count AS deleted_likes,
           v_match_count AS deleted_matches,
           v_whisper_count AS deleted_whispers,
           v_legacy_whisper_count AS deleted_legacy_whispers,
           v_conversation_count AS deleted_conversations,
           v_message_count AS deleted_messages,
           v_remaining_count AS remaining_key_rows;
END$$

DELIMITER ;

CALL `spacetime_ops_reset_relation_pair_20261009`();

DROP PROCEDURE IF EXISTS `spacetime_ops_reset_relation_pair_20261009`;
