-- =============================================================
-- App 用户管理：彻底删除用户及其业务数据
-- 说明：
-- 1. 存储过程只执行数据清理，不开启、提交或回滚事务，由 Spring 事务统一控制。
-- 2. 用户主表最后删除，删除数量异常时主动抛错。
-- 3. 内容操作日志不在过程中删除，供后台在清理后写入最小化审计记录。
-- 4. 历史兼容表仅在实际存在时清理，兼容新建环境与已运行过历史迁移的环境。
-- =============================================================

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
        biz_no VARCHAR(64) DEFAULT NULL
    ) ENGINE=InnoDB;
    INSERT INTO tmp_spacetime_delete_posts (id, biz_no)
    SELECT id, post_no FROM community_post WHERE author_id = p_user_id;

    DROP TEMPORARY TABLE IF EXISTS tmp_spacetime_delete_comments;
    CREATE TEMPORARY TABLE tmp_spacetime_delete_comments (
        id BIGINT NOT NULL PRIMARY KEY,
        biz_no VARCHAR(64) DEFAULT NULL
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
    DELETE FROM app_user_relation_block
     WHERE user_id = p_user_id OR target_user_id = p_user_id;

    -- 社区：删除用户内容、与其内容关联的互动、治理记录和待投递事件。
    DELETE FROM community_media_audit_task
     WHERE post_id IN (SELECT id FROM tmp_spacetime_delete_posts);
    DELETE FROM community_audit_record
     WHERE (UPPER(biz_type) IN ('POST', 'COMMUNITY_POST')
            AND (biz_id IN (SELECT id FROM tmp_spacetime_delete_posts)
                 OR biz_no IN (SELECT biz_no FROM tmp_spacetime_delete_posts)))
        OR (UPPER(biz_type) IN ('COMMENT', 'COMMUNITY_COMMENT')
            AND (biz_id IN (SELECT id FROM tmp_spacetime_delete_comments)
                 OR biz_no IN (SELECT biz_no FROM tmp_spacetime_delete_comments)))
        OR (UPPER(biz_type) IN ('REPORT', 'COMMUNITY_REPORT')
            AND biz_id IN (SELECT id FROM tmp_spacetime_delete_reports));
    DELETE FROM community_event_outbox
     WHERE (UPPER(aggregate_type) IN ('POST', 'COMMUNITY_POST')
            AND aggregate_no IN (SELECT biz_no FROM tmp_spacetime_delete_posts))
        OR (UPPER(aggregate_type) IN ('COMMENT', 'COMMUNITY_COMMENT')
            AND aggregate_no IN (SELECT biz_no FROM tmp_spacetime_delete_comments));
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
     WHERE user_id = p_user_id
        OR relation_id IN (
            SELECT id FROM promotion_invite_relation
             WHERE inviter_id = p_user_id OR invitee_id = p_user_id
        );
    DELETE FROM promotion_agent_event
     WHERE user_id = p_user_id
        OR relation_id IN (
            SELECT id FROM promotion_invite_relation
             WHERE inviter_id = p_user_id OR invitee_id = p_user_id
        );
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
    DELETE FROM promotion_invite_relation
     WHERE inviter_id = p_user_id OR invitee_id = p_user_id;
    DELETE FROM promotion_source_trace
     WHERE inviter_id = p_user_id
        OR visitor_user_id = p_user_id
        OR invitee_user_id = p_user_id;

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

-- 独立高风险权限：只默认授予超级管理员，其他角色需人工授权。
INSERT INTO sys_menu
    (parent_id, menu_name, menu_type, perms, menu_sort, visible, status, remark, create_time, update_time)
SELECT parent.id, '彻底删除App用户', 'F', 'user:app:delete', 99, 0, 'ENABLED',
       '彻底删除App用户账号、认证及关联业务数据', NOW(), NOW()
  FROM sys_menu parent
 WHERE parent.perms='user:app:list'
   AND parent.menu_type='C'
   AND parent.status='ENABLED'
   AND parent.deleted=0
   AND NOT EXISTS (
       SELECT 1 FROM sys_menu WHERE perms='user:app:delete' AND menu_type='F' AND deleted=0
   )
 LIMIT 1;

-- 修复历史上可能被挂到旧菜单的同名权限。
UPDATE sys_menu delete_menu
JOIN sys_menu parent
  ON parent.perms='user:app:list'
 AND parent.menu_type='C'
 AND parent.status='ENABLED'
 AND parent.deleted=0
SET delete_menu.parent_id=parent.id,
    delete_menu.status='ENABLED',
    delete_menu.update_time=NOW()
WHERE delete_menu.perms='user:app:delete'
  AND delete_menu.menu_type='F'
  AND delete_menu.deleted=0;

INSERT IGNORE INTO sys_role_menu (role_id, menu_id)
SELECT r.id, m.id
  FROM sys_role r
  JOIN sys_menu m ON m.perms='user:app:delete' AND m.deleted=0
 WHERE r.role_code='super_admin'
   AND r.status='ENABLED'
   AND r.deleted=0;

