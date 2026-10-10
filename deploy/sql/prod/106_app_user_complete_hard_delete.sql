-- App 用户完整物理删除过程升级。
-- 本文件包含完整过程定义，不依赖生产环境重新执行历史 066/089 迁移。
-- 补齐 PRD-03 消息、私信、悄悄话、通知、TIM 账号与举报冻结证据。

SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS spacetime_delete_app_user_data;

DELIMITER $$

CREATE PROCEDURE spacetime_delete_app_user_data(IN p_user_id BIGINT)
delete_main: BEGIN
    DECLARE v_user_count INT DEFAULT 0;
    DECLARE v_deleted_user_count INT DEFAULT 0;
    DECLARE v_remaining_count BIGINT DEFAULT 0;

    IF p_user_id IS NULL OR p_user_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '用户ID无效，已停止删除';
    END IF;

    SELECT COUNT(*)
      INTO v_user_count
      FROM app_user
     WHERE id = p_user_id AND deleted = 0;

    IF v_user_count <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '用户不存在或已删除';
    END IF;

    -- 固化待删除的社区内容标识，保证后续删除顺序不丢失关联范围。
    DROP TEMPORARY TABLE IF EXISTS tmp_spacetime_delete_posts;
    CREATE TEMPORARY TABLE tmp_spacetime_delete_posts (
        id BIGINT NOT NULL PRIMARY KEY,
        biz_no VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
    ) ENGINE=InnoDB;
    INSERT INTO tmp_spacetime_delete_posts (id, biz_no)
    SELECT id, post_no FROM community_post WHERE author_id = p_user_id;

    DROP TEMPORARY TABLE IF EXISTS tmp_spacetime_delete_comments;
    CREATE TEMPORARY TABLE tmp_spacetime_delete_comments (
        id BIGINT NOT NULL PRIMARY KEY,
        biz_no VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
    ) ENGINE=InnoDB;
    INSERT INTO tmp_spacetime_delete_comments (id, biz_no)
    SELECT c.id, c.comment_no
      FROM community_comment c
     WHERE c.author_id = p_user_id
        OR c.reply_user_id = p_user_id
        OR c.post_id IN (SELECT id FROM tmp_spacetime_delete_posts);

    DROP TEMPORARY TABLE IF EXISTS tmp_spacetime_delete_reports;
    CREATE TEMPORARY TABLE tmp_spacetime_delete_reports (
        id BIGINT NOT NULL PRIMARY KEY
    ) ENGINE=InnoDB;
    INSERT INTO tmp_spacetime_delete_reports (id)
    SELECT r.id
     FROM community_report r
     WHERE r.reporter_id = p_user_id
        OR r.target_user_id = p_user_id
        OR r.reported_user_id = p_user_id
        OR (UPPER(r.target_type) = 'USER' AND r.target_id = p_user_id)
        OR (UPPER(r.target_type) = 'POST'
            AND r.target_id IN (SELECT id FROM tmp_spacetime_delete_posts))
        OR (UPPER(r.target_type) = 'COMMENT'
            AND r.target_id IN (SELECT id FROM tmp_spacetime_delete_comments));

    -- 固化双方共享的消息范围，避免先删主表后丢失关联消息和冻结证据。
    DROP TEMPORARY TABLE IF EXISTS tmp_spacetime_delete_conversations;
    CREATE TEMPORARY TABLE tmp_spacetime_delete_conversations (
        id BIGINT NOT NULL PRIMARY KEY,
        biz_no VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
    ) ENGINE=InnoDB;
    INSERT INTO tmp_spacetime_delete_conversations (id, biz_no)
    SELECT id, conversation_no
      FROM app_message_conversation
     WHERE user_low_id = p_user_id
        OR user_high_id = p_user_id
        OR female_user_id = p_user_id
        OR male_user_id = p_user_id
        OR blocked_by_user_id = p_user_id;

    DROP TEMPORARY TABLE IF EXISTS tmp_spacetime_delete_messages;
    CREATE TEMPORARY TABLE tmp_spacetime_delete_messages (
        id BIGINT NOT NULL PRIMARY KEY,
        biz_no VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
    ) ENGINE=InnoDB;
    INSERT INTO tmp_spacetime_delete_messages (id, biz_no)
    SELECT id, message_no
      FROM app_message_record
     WHERE sender_user_id = p_user_id
        OR receiver_user_id = p_user_id
        OR conversation_id IN (SELECT id FROM tmp_spacetime_delete_conversations);

    DROP TEMPORARY TABLE IF EXISTS tmp_spacetime_delete_whispers;
    CREATE TEMPORARY TABLE tmp_spacetime_delete_whispers (
        id BIGINT NOT NULL PRIMARY KEY,
        biz_no VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
    ) ENGINE=InnoDB;
    INSERT INTO tmp_spacetime_delete_whispers (id, biz_no)
    SELECT id, whisper_no
      FROM app_message_whisper
     WHERE sender_user_id = p_user_id OR receiver_user_id = p_user_id
        OR user_low_id = p_user_id OR user_high_id = p_user_id;

    -- 推荐与理想型：候选明细先于快照删除，双向清理候选曝光。
    DELETE FROM ct_ideal_snapshot_candidate
     WHERE candidate_user_id = p_user_id
        OR snapshot_id IN (
            SELECT id FROM ct_ideal_filter_snapshot WHERE user_id = p_user_id
        );
    DELETE FROM ct_recommend_view_log
     WHERE user_id = p_user_id OR candidate_user_id = p_user_id;
    DELETE FROM ct_ideal_filter_snapshot WHERE user_id = p_user_id;
    DELETE FROM ct_recommend_preference WHERE user_id = p_user_id;

    -- 商业化：先清支付回调和退款，再清订单、资产与双向解锁。
    -- 历史环境中支付回调表与订单表可能继承过不同的数据库默认排序规则。
    -- 跨表匹配订单号时显式统一，避免 MySQL 1267 导致整个删除事务回滚。
    DELETE payment_log
      FROM app_payment_notify_log payment_log
      JOIN app_trade_order trade_order
        ON payment_log.order_no COLLATE utf8mb4_unicode_ci
         = trade_order.order_no COLLATE utf8mb4_unicode_ci
     WHERE trade_order.user_id = p_user_id;
    DELETE FROM app_refund_record
     WHERE user_id = p_user_id
        OR order_id IN (
            SELECT id FROM app_trade_order WHERE user_id = p_user_id
        );
    DELETE FROM app_user_coin_log WHERE user_id = p_user_id;
    DELETE FROM app_trade_order WHERE user_id = p_user_id;
    DELETE FROM app_user_asset WHERE user_id = p_user_id;
    DELETE FROM app_user_unlock_record
     WHERE user_id = p_user_id OR target_user_id = p_user_id;

    -- 消息域：先删投递与冻结证据，再删共享会话事实和单用户通知。
    DELETE FROM app_message_delivery_outbox
     WHERE sender_user_id = p_user_id
        OR receiver_user_id = p_user_id
        OR (aggregate_type = 'message'
            AND aggregate_id IN (SELECT id FROM tmp_spacetime_delete_messages))
        OR (aggregate_type = 'whisper'
            AND aggregate_id IN (SELECT id FROM tmp_spacetime_delete_whispers));
    DELETE FROM community_report_evidence
     WHERE report_id IN (SELECT id FROM tmp_spacetime_delete_reports)
        OR sender_user_id = p_user_id
        OR receiver_user_id = p_user_id
        OR source_biz_no COLLATE utf8mb4_unicode_ci IN (
            SELECT biz_no FROM tmp_spacetime_delete_messages
        )
        OR source_biz_no COLLATE utf8mb4_unicode_ci IN (
            SELECT biz_no FROM tmp_spacetime_delete_whispers
        )
        OR conversation_no COLLATE utf8mb4_unicode_ci IN (
            SELECT biz_no FROM tmp_spacetime_delete_conversations
        );
    DELETE FROM app_message_event_inbox
     WHERE receiver_user_id = p_user_id
        OR biz_no COLLATE utf8mb4_unicode_ci IN (
            SELECT biz_no FROM tmp_spacetime_delete_messages
        )
        OR biz_no COLLATE utf8mb4_unicode_ci IN (
            SELECT biz_no FROM tmp_spacetime_delete_whispers
        )
        OR biz_no COLLATE utf8mb4_unicode_ci IN (
            SELECT biz_no FROM tmp_spacetime_delete_conversations
        );
    DELETE FROM app_message_conversation_member
     WHERE user_id = p_user_id
        OR peer_user_id = p_user_id
        OR conversation_id IN (SELECT id FROM tmp_spacetime_delete_conversations);
    DELETE FROM app_message_whisper
     WHERE id IN (SELECT id FROM tmp_spacetime_delete_whispers);
    DELETE FROM app_message_record
     WHERE id IN (SELECT id FROM tmp_spacetime_delete_messages);
    DELETE FROM app_message_conversation
     WHERE id IN (SELECT id FROM tmp_spacetime_delete_conversations);
    DELETE FROM app_whisper
     WHERE sender_user_id = p_user_id OR receiver_user_id = p_user_id;
    DELETE FROM app_system_message WHERE receiver_user_id = p_user_id;
    DELETE FROM app_assistant_message WHERE receiver_user_id = p_user_id;
    DELETE FROM app_user_im_account WHERE user_id = p_user_id;

    -- 关系链：先清匹配、访客派生记录，再清双向关系。
    DELETE FROM app_relation_match_popup
     WHERE user_id = p_user_id
        OR match_id IN (
            SELECT id FROM app_relation_match
             WHERE user_low_id = p_user_id OR user_high_id = p_user_id
        );

    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'app_relation_match_source'
    ) THEN
        SET @delete_user_id = p_user_id;
        SET @delete_sql = 'DELETE FROM app_relation_match_source WHERE match_id IN (SELECT id FROM app_relation_match WHERE user_low_id = ? OR user_high_id = ?)';
        PREPARE delete_stmt FROM @delete_sql;
        EXECUTE delete_stmt USING @delete_user_id, @delete_user_id;
        DEALLOCATE PREPARE delete_stmt;
    END IF;

    DELETE FROM app_relation_match
     WHERE user_low_id = p_user_id OR user_high_id = p_user_id;
    DELETE FROM app_relation_visit_event
     WHERE visitor_user_id = p_user_id
        OR target_user_id = p_user_id
        OR visit_id IN (
            SELECT id FROM app_relation_visit
             WHERE visitor_user_id = p_user_id OR target_user_id = p_user_id
        );
    DELETE FROM app_relation_visit_cursor
     WHERE visitor_user_id = p_user_id OR target_user_id = p_user_id;
    DELETE FROM app_relation_visit
     WHERE visitor_user_id = p_user_id OR target_user_id = p_user_id;
    DELETE FROM app_relation_like
     WHERE from_user_id = p_user_id OR to_user_id = p_user_id;
    DELETE FROM app_relation_like_inbox_state WHERE user_id = p_user_id;
    DELETE FROM app_relation_visit_inbox_state WHERE user_id = p_user_id;
    DELETE FROM app_user_relation_block
     WHERE user_id = p_user_id OR target_user_id = p_user_id;

    -- 社区：删除用户内容、与其内容关联的互动、治理记录和待投递事件。
    DELETE FROM community_media_audit_task
     WHERE post_id IN (SELECT id FROM tmp_spacetime_delete_posts);
    DELETE audit_record
      FROM community_audit_record audit_record
     WHERE (UPPER(audit_record.biz_type) IN ('POST', 'COMMUNITY_POST')
            AND EXISTS (
                SELECT 1 FROM tmp_spacetime_delete_posts post_scope
                 WHERE audit_record.biz_id = post_scope.id
                    OR audit_record.biz_no COLLATE utf8mb4_unicode_ci = post_scope.biz_no
            ))
        OR (UPPER(audit_record.biz_type) IN ('COMMENT', 'COMMUNITY_COMMENT')
            AND EXISTS (
                SELECT 1 FROM tmp_spacetime_delete_comments comment_scope
                 WHERE audit_record.biz_id = comment_scope.id
                    OR audit_record.biz_no COLLATE utf8mb4_unicode_ci = comment_scope.biz_no
            ))
        OR (UPPER(audit_record.biz_type) IN ('REPORT', 'COMMUNITY_REPORT')
            AND EXISTS (
                SELECT 1 FROM tmp_spacetime_delete_reports report_scope
                 WHERE audit_record.biz_id = report_scope.id
            ));
    DELETE FROM community_event_outbox
     WHERE (UPPER(aggregate_type) IN ('POST', 'COMMUNITY_POST')
            AND aggregate_no COLLATE utf8mb4_unicode_ci IN (
                SELECT biz_no FROM tmp_spacetime_delete_posts
            ))
        OR (UPPER(aggregate_type) IN ('COMMENT', 'COMMUNITY_COMMENT')
            AND aggregate_no COLLATE utf8mb4_unicode_ci IN (
                SELECT biz_no FROM tmp_spacetime_delete_comments
            ));
    DELETE FROM community_report
     WHERE id IN (SELECT id FROM tmp_spacetime_delete_reports);
    DELETE FROM community_comment_like
     WHERE user_id = p_user_id
        OR comment_id IN (SELECT id FROM tmp_spacetime_delete_comments);
    DELETE FROM community_like
     WHERE user_id = p_user_id
        OR post_id IN (SELECT id FROM tmp_spacetime_delete_posts);
    DELETE FROM community_view_history
     WHERE user_id = p_user_id
        OR post_id IN (SELECT id FROM tmp_spacetime_delete_posts);
    DELETE FROM community_comment
     WHERE id IN (SELECT id FROM tmp_spacetime_delete_comments);
    DELETE FROM community_follow
     WHERE follower_id = p_user_id OR target_user_id = p_user_id;
    DELETE FROM community_content_preference
     WHERE user_id = p_user_id OR target_user_id = p_user_id;
    DELETE FROM community_post_draft WHERE user_id = p_user_id;
    DELETE FROM community_user_restriction WHERE user_id = p_user_id;
    DELETE FROM community_post
     WHERE id IN (SELECT id FROM tmp_spacetime_delete_posts);

    -- 当前推广表：关系和奖励均按邀请人、被邀请人双向清理。
    DELETE FROM promotion_agent_bonus_log
     WHERE invitee_id = p_user_id
        OR relation_id IN (
            SELECT id FROM promotion_invite_relation
             WHERE inviter_id = p_user_id OR invitee_id = p_user_id
        );
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promotion_agent_event'
    ) THEN
        SET @delete_user_id = p_user_id;
        SET @delete_sql = 'DELETE FROM promotion_agent_event WHERE user_id = ? OR relation_id IN (SELECT id FROM promotion_invite_relation WHERE inviter_id = ? OR invitee_id = ?)';
        PREPARE delete_stmt FROM @delete_sql;
        EXECUTE delete_stmt USING @delete_user_id, @delete_user_id, @delete_user_id;
        DEALLOCATE PREPARE delete_stmt;
    END IF;
    DELETE FROM promotion_reward_log
     WHERE inviter_id = p_user_id
        OR invitee_id = p_user_id
        OR relation_id IN (
            SELECT id FROM promotion_invite_relation
             WHERE inviter_id = p_user_id OR invitee_id = p_user_id
        );
    DELETE FROM promotion_event_inbox WHERE user_id = p_user_id;
    DELETE FROM promotion_invite_counter
     WHERE source_type = 'normal_user' AND reward_object_id = p_user_id;
    DELETE FROM promotion_source_trace
     WHERE inviter_id = p_user_id
        OR id IN (
            SELECT source_trace_id FROM promotion_invite_relation
             WHERE (inviter_id = p_user_id OR invitee_id = p_user_id)
               AND source_trace_id IS NOT NULL
        );
    DELETE FROM promotion_invite_relation
     WHERE inviter_id = p_user_id OR invitee_id = p_user_id;

    -- 2026-07-27 推广重构前的历史兼容表，仅在对应表存在时清理。
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promotion_agent_bonus_log_legacy_20260727'
    ) THEN
        SET @delete_user_id = p_user_id;
        SET @delete_sql = 'DELETE FROM promotion_agent_bonus_log_legacy_20260727 WHERE user_id = ? OR relation_id IN (SELECT id FROM promotion_invite_relation_legacy_20260727 WHERE inviter_id = ? OR invitee_id = ?)';
        PREPARE delete_stmt FROM @delete_sql;
        EXECUTE delete_stmt USING @delete_user_id, @delete_user_id, @delete_user_id;
        DEALLOCATE PREPARE delete_stmt;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promotion_agent_event_legacy_20260727'
    ) THEN
        SET @delete_user_id = p_user_id;
        SET @delete_sql = 'DELETE FROM promotion_agent_event_legacy_20260727 WHERE user_id = ? OR relation_id IN (SELECT id FROM promotion_invite_relation_legacy_20260727 WHERE inviter_id = ? OR invitee_id = ?)';
        PREPARE delete_stmt FROM @delete_sql;
        EXECUTE delete_stmt USING @delete_user_id, @delete_user_id, @delete_user_id;
        DEALLOCATE PREPARE delete_stmt;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promotion_reward_log_legacy_20260727'
    ) THEN
        SET @delete_user_id = p_user_id;
        SET @delete_sql = 'DELETE FROM promotion_reward_log_legacy_20260727 WHERE inviter_id = ? OR invitee_id = ? OR relation_id IN (SELECT id FROM promotion_invite_relation_legacy_20260727 WHERE inviter_id = ? OR invitee_id = ?)';
        PREPARE delete_stmt FROM @delete_sql;
        EXECUTE delete_stmt USING @delete_user_id, @delete_user_id, @delete_user_id, @delete_user_id;
        DEALLOCATE PREPARE delete_stmt;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promotion_invite_relation_legacy_20260727'
    ) THEN
        SET @delete_user_id = p_user_id;
        SET @delete_sql = 'DELETE FROM promotion_invite_relation_legacy_20260727 WHERE inviter_id = ? OR invitee_id = ?';
        PREPARE delete_stmt FROM @delete_sql;
        EXECUTE delete_stmt USING @delete_user_id, @delete_user_id;
        DEALLOCATE PREPARE delete_stmt;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'promotion_source_trace_legacy_20260727'
    ) THEN
        SET @delete_user_id = p_user_id;
        SET @delete_sql = 'DELETE FROM promotion_source_trace_legacy_20260727 WHERE inviter_id = ? OR visitor_user_id = ? OR invitee_user_id = ?';
        PREPARE delete_stmt FROM @delete_sql;
        EXECUTE delete_stmt USING @delete_user_id, @delete_user_id, @delete_user_id;
        DEALLOCATE PREPARE delete_stmt;
    END IF;

    -- 注销、认证、外部审核任务和用户设置。
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'app_user_cancel_remark'
    ) THEN
        SET @delete_user_id = p_user_id;
        SET @delete_sql = 'DELETE FROM app_user_cancel_remark WHERE user_id = ? OR request_id IN (SELECT id FROM app_user_cancel_request WHERE user_id = ?)';
        PREPARE delete_stmt FROM @delete_sql;
        EXECUTE delete_stmt USING @delete_user_id, @delete_user_id;
        DEALLOCATE PREPARE delete_stmt;
    END IF;
    DELETE FROM app_user_cancel_request WHERE user_id = p_user_id;
    DELETE FROM app_user_audit_history WHERE user_id = p_user_id;
    DELETE FROM external_provider_task WHERE user_id = p_user_id;
    DELETE FROM app_user_audit_record WHERE user_id = p_user_id;
    DELETE FROM app_user_feedback WHERE user_id = p_user_id;
    DELETE FROM app_user_import_row WHERE user_id = p_user_id;
    DELETE FROM app_user_keyword_block WHERE user_id = p_user_id;
    DELETE FROM app_user_notification_setting WHERE user_id = p_user_id;
    DELETE FROM app_user_privacy_setting WHERE user_id = p_user_id;
    DELETE FROM app_user_search_log WHERE user_id = p_user_id;
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'app_user_search_summary'
    ) THEN
        SET @delete_user_id = p_user_id;
        SET @delete_sql = 'DELETE FROM app_user_search_summary WHERE user_id = ?';
        PREPARE delete_stmt FROM @delete_sql;
        EXECUTE delete_stmt USING @delete_user_id;
        DEALLOCATE PREPARE delete_stmt;
    END IF;
    DELETE FROM app_user_security_audit_log WHERE user_id = p_user_id;

    -- 删除主表前对关键直接用户引用做最终核验；发现残留则由 Spring 事务整体回滚。
    -- MySQL 临时表在同一条语句中不能被重复打开。这里必须逐项累加，不能把
    -- Inbox、Outbox、举报证据三个子查询合并到同一个 SET 表达式中。
    SET v_remaining_count = 0;
    SET v_remaining_count = v_remaining_count +
        (SELECT COUNT(*) FROM app_message_record
          WHERE sender_user_id = p_user_id OR receiver_user_id = p_user_id);
    SET v_remaining_count = v_remaining_count +
        (SELECT COUNT(*) FROM app_message_conversation
          WHERE user_low_id = p_user_id OR user_high_id = p_user_id
             OR female_user_id = p_user_id OR male_user_id = p_user_id
             OR blocked_by_user_id = p_user_id);
    SET v_remaining_count = v_remaining_count +
        (SELECT COUNT(*) FROM app_message_conversation_member
          WHERE user_id = p_user_id OR peer_user_id = p_user_id);
    SET v_remaining_count = v_remaining_count +
        (SELECT COUNT(*) FROM app_message_whisper
          WHERE sender_user_id = p_user_id OR receiver_user_id = p_user_id
             OR user_low_id = p_user_id OR user_high_id = p_user_id);
    SET v_remaining_count = v_remaining_count +
        (SELECT COUNT(*) FROM app_whisper
          WHERE sender_user_id = p_user_id OR receiver_user_id = p_user_id);
    SET v_remaining_count = v_remaining_count +
        (SELECT COUNT(*) FROM app_system_message WHERE receiver_user_id = p_user_id);
    SET v_remaining_count = v_remaining_count +
        (SELECT COUNT(*) FROM app_assistant_message WHERE receiver_user_id = p_user_id);
    SET v_remaining_count = v_remaining_count +
        (SELECT COUNT(*) FROM app_message_event_inbox
          WHERE receiver_user_id = p_user_id
             OR biz_no COLLATE utf8mb4_unicode_ci IN (
                  SELECT biz_no FROM tmp_spacetime_delete_messages
             )
             OR biz_no COLLATE utf8mb4_unicode_ci IN (
                  SELECT biz_no FROM tmp_spacetime_delete_whispers
             )
             OR biz_no COLLATE utf8mb4_unicode_ci IN (
                  SELECT biz_no FROM tmp_spacetime_delete_conversations
             ));
    SET v_remaining_count = v_remaining_count +
        (SELECT COUNT(*) FROM app_message_delivery_outbox
          WHERE sender_user_id = p_user_id OR receiver_user_id = p_user_id
             OR (aggregate_type = 'message'
                 AND aggregate_id IN (SELECT id FROM tmp_spacetime_delete_messages))
             OR (aggregate_type = 'whisper'
                 AND aggregate_id IN (SELECT id FROM tmp_spacetime_delete_whispers)));
    SET v_remaining_count = v_remaining_count +
        (SELECT COUNT(*) FROM app_user_im_account WHERE user_id = p_user_id);
    SET v_remaining_count = v_remaining_count +
        (SELECT COUNT(*) FROM community_report_evidence
          WHERE report_id IN (SELECT id FROM tmp_spacetime_delete_reports)
             OR sender_user_id = p_user_id OR receiver_user_id = p_user_id
             OR source_biz_no COLLATE utf8mb4_unicode_ci IN (
                  SELECT biz_no FROM tmp_spacetime_delete_messages
             )
             OR source_biz_no COLLATE utf8mb4_unicode_ci IN (
                  SELECT biz_no FROM tmp_spacetime_delete_whispers
             )
             OR conversation_no COLLATE utf8mb4_unicode_ci IN (
                  SELECT biz_no FROM tmp_spacetime_delete_conversations
             ));
    SET v_remaining_count = v_remaining_count +
        (SELECT COUNT(*) FROM community_report
          WHERE reporter_id = p_user_id OR target_user_id = p_user_id
             OR reported_user_id = p_user_id
             OR (UPPER(target_type) = 'USER'
                 AND CAST(target_id AS UNSIGNED) = p_user_id));
    IF v_remaining_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '用户关联数据仍有残留，已停止删除';
    END IF;

    -- 用户主表必须最后删除；再次登录时会创建全新的用户 ID。
    DELETE FROM app_user WHERE id = p_user_id AND deleted = 0;
    SET v_deleted_user_count = ROW_COUNT();
    IF v_deleted_user_count <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '用户主表删除数量异常';
    END IF;

    DROP TEMPORARY TABLE IF EXISTS tmp_spacetime_delete_reports;
    DROP TEMPORARY TABLE IF EXISTS tmp_spacetime_delete_comments;
    DROP TEMPORARY TABLE IF EXISTS tmp_spacetime_delete_posts;
    DROP TEMPORARY TABLE IF EXISTS tmp_spacetime_delete_whispers;
    DROP TEMPORARY TABLE IF EXISTS tmp_spacetime_delete_messages;
    DROP TEMPORARY TABLE IF EXISTS tmp_spacetime_delete_conversations;
END $$

DELIMITER ;
