-- 最近访客已读游标上线后的 App 用户彻底删除过程升级。
-- 本文件包含完整过程定义，不依赖生产环境重新执行历史 066 迁移。

SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS spacetime_delete_app_user_data;

DELIMITER $$

CREATE PROCEDURE spacetime_delete_app_user_data(IN p_user_id BIGINT)
delete_main: BEGIN
    DECLARE v_user_count INT DEFAULT 0;
    DECLARE v_deleted_user_count INT DEFAULT 0;

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
        OR (UPPER(r.target_type) = 'USER' AND r.target_id = p_user_id)
        OR (UPPER(r.target_type) = 'POST'
            AND r.target_id IN (SELECT id FROM tmp_spacetime_delete_posts))
        OR (UPPER(r.target_type) = 'COMMENT'
            AND r.target_id IN (SELECT id FROM tmp_spacetime_delete_comments));

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
    DELETE FROM app_payment_notify_log
     WHERE order_no IN (
         SELECT order_no FROM app_trade_order WHERE user_id = p_user_id
     );
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
END $$

DELIMITER ;
