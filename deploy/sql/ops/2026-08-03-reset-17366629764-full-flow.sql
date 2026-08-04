-- =====================================================
-- 清空指定测试账号的全部数据库业务数据，重新走完整注册流程
-- 目标账号：17366629764
--
-- 使用说明：
-- 1. 仅允许在确认目标手机号后执行；脚本不写死用户 ID。
-- 2. 删除用户主表及认证、关系、社区、商业化、推广等关联记录。
-- 3. 不删除 OSS 对象；数据库引用清空后，旧文件成为待定期清理的孤立对象。
-- 4. 不清理 Redis 登录态；执行后还需删除该用户的 miniapp:token:* 会话。
-- 5. 可重复执行：账号尚未重新注册时再次执行会返回 ALREADY_CLEARED。
-- =====================================================

DROP PROCEDURE IF EXISTS spacetime_reset_17366629764_full_flow;

DELIMITER $$

CREATE PROCEDURE spacetime_reset_17366629764_full_flow()
reset_main: BEGIN
    DECLARE v_target_phone VARCHAR(30) DEFAULT '17366629764';
    DECLARE v_user_count INT DEFAULT 0;
    DECLARE v_user_id BIGINT DEFAULT NULL;
    DECLARE v_deleted_user_count INT DEFAULT 0;
    DECLARE v_remaining_count BIGINT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT COUNT(*), MAX(id)
      INTO v_user_count, v_user_id
      FROM app_user
     WHERE CAST(phone AS BINARY) = CAST(v_target_phone AS BINARY)
       AND deleted = 0;

    IF v_user_count = 0 THEN
        SELECT v_target_phone AS phone,
               'ALREADY_CLEARED' AS reset_status,
               0 AS deleted_user_count;
        LEAVE reset_main;
    END IF;

    IF v_user_count <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '目标手机号存在重复有效账号，已停止清理';
    END IF;

    START TRANSACTION;

    -- 商业化：先删订单派生记录，再删用户资产和订单。
    DELETE FROM app_payment_notify_log
     WHERE order_no IN (
         SELECT order_no FROM app_trade_order WHERE user_id = v_user_id
     );

    DELETE FROM app_refund_record
     WHERE user_id = v_user_id
        OR order_id IN (
            SELECT id FROM app_trade_order WHERE user_id = v_user_id
        );

    DELETE FROM app_user_coin_log WHERE user_id = v_user_id;
    DELETE FROM app_trade_order WHERE user_id = v_user_id;
    DELETE FROM app_user_asset WHERE user_id = v_user_id;
    DELETE FROM app_user_unlock_record
     WHERE user_id = v_user_id OR target_user_id = v_user_id;

    -- 关系链：删除双向喜欢、访问、匹配及弹窗游标。
    DELETE FROM app_relation_match_popup
     WHERE user_id = v_user_id
        OR match_id IN (
            SELECT id
              FROM app_relation_match
             WHERE user_low_id = v_user_id OR user_high_id = v_user_id
        );

    DELETE FROM app_relation_match_source
     WHERE match_id IN (
         SELECT id
           FROM app_relation_match
          WHERE user_low_id = v_user_id OR user_high_id = v_user_id
     );

    DELETE FROM app_relation_match
     WHERE user_low_id = v_user_id OR user_high_id = v_user_id;

    DELETE FROM app_relation_visit_event
     WHERE visitor_user_id = v_user_id
        OR target_user_id = v_user_id
        OR visit_id IN (
            SELECT id
              FROM app_relation_visit
             WHERE visitor_user_id = v_user_id OR target_user_id = v_user_id
        );

    DELETE FROM app_relation_visit_cursor
     WHERE visitor_user_id = v_user_id OR target_user_id = v_user_id;

    DELETE FROM app_relation_visit
     WHERE visitor_user_id = v_user_id OR target_user_id = v_user_id;

    DELETE FROM app_relation_like
     WHERE from_user_id = v_user_id OR to_user_id = v_user_id;

    DELETE FROM app_relation_like_inbox_state WHERE user_id = v_user_id;
    DELETE FROM app_user_relation_block
     WHERE user_id = v_user_id OR target_user_id = v_user_id;

    -- 社区：先删举报、点赞和评论，再删帖子，避免遗留内容引用。
    DELETE FROM community_report
     WHERE reporter_id = v_user_id
        OR (
            UPPER(target_type) = 'POST'
            AND target_id IN (
                SELECT id FROM community_post WHERE author_id = v_user_id
            )
        )
        OR (
            UPPER(target_type) = 'COMMENT'
            AND target_id IN (
                SELECT id
                  FROM community_comment
                 WHERE author_id = v_user_id
                    OR reply_user_id = v_user_id
                    OR post_id IN (
                        SELECT id FROM community_post WHERE author_id = v_user_id
                    )
            )
        );

    DELETE FROM community_like
     WHERE user_id = v_user_id
        OR post_id IN (
            SELECT id FROM community_post WHERE author_id = v_user_id
        );

    DELETE FROM community_comment
     WHERE author_id = v_user_id
        OR reply_user_id = v_user_id
        OR post_id IN (
            SELECT id FROM community_post WHERE author_id = v_user_id
        );

    DELETE FROM community_follow
     WHERE follower_id = v_user_id OR target_user_id = v_user_id;

    DELETE FROM community_post WHERE author_id = v_user_id;

    -- 推广：清理当前表及仍保留的 20260727 历史兼容表。
    DELETE FROM promotion_agent_bonus_log
     WHERE invitee_id = v_user_id
        OR relation_id IN (
            SELECT id
              FROM promotion_invite_relation
             WHERE inviter_id = v_user_id OR invitee_id = v_user_id
        );

    DELETE FROM promotion_reward_log
     WHERE inviter_id = v_user_id
        OR invitee_id = v_user_id
        OR relation_id IN (
            SELECT id
              FROM promotion_invite_relation
             WHERE inviter_id = v_user_id OR invitee_id = v_user_id
        );

    DELETE FROM promotion_event_inbox WHERE user_id = v_user_id;
    DELETE FROM promotion_invite_counter
     WHERE source_type = 'normal_user' AND reward_object_id = v_user_id;
    DELETE FROM promotion_invite_relation
     WHERE inviter_id = v_user_id OR invitee_id = v_user_id;
    DELETE FROM promotion_source_trace WHERE inviter_id = v_user_id;

    DELETE FROM promotion_agent_bonus_log_legacy_20260727
     WHERE user_id = v_user_id
        OR relation_id IN (
            SELECT id
              FROM promotion_invite_relation_legacy_20260727
             WHERE inviter_id = v_user_id OR invitee_id = v_user_id
        );

    DELETE FROM promotion_agent_event_legacy_20260727
     WHERE user_id = v_user_id
        OR relation_id IN (
            SELECT id
              FROM promotion_invite_relation_legacy_20260727
             WHERE inviter_id = v_user_id OR invitee_id = v_user_id
        );

    DELETE FROM promotion_reward_log_legacy_20260727
     WHERE inviter_id = v_user_id
        OR invitee_id = v_user_id
        OR relation_id IN (
            SELECT id
              FROM promotion_invite_relation_legacy_20260727
             WHERE inviter_id = v_user_id OR invitee_id = v_user_id
        );

    DELETE FROM promotion_invite_relation_legacy_20260727
     WHERE inviter_id = v_user_id OR invitee_id = v_user_id;

    DELETE FROM promotion_source_trace_legacy_20260727
     WHERE inviter_id = v_user_id
        OR visitor_user_id = v_user_id
        OR invitee_user_id = v_user_id;

    -- 账号注销、审核、第三方任务及用户侧设置。
    DELETE FROM app_user_cancel_remark
     WHERE user_id = v_user_id
        OR request_id IN (
            SELECT id FROM app_user_cancel_request WHERE user_id = v_user_id
        );
    DELETE FROM app_user_cancel_request
     WHERE user_id = v_user_id OR active_cooling_user_id = v_user_id;

    DELETE FROM app_user_audit_history WHERE user_id = v_user_id;
    DELETE FROM external_provider_task WHERE user_id = v_user_id;
    DELETE FROM app_user_audit_record WHERE user_id = v_user_id;

    DELETE FROM app_user_feedback WHERE user_id = v_user_id;
    DELETE FROM app_user_import_row WHERE user_id = v_user_id;
    DELETE FROM app_user_keyword_block WHERE user_id = v_user_id;
    DELETE FROM app_user_notification_setting WHERE user_id = v_user_id;
    DELETE FROM app_user_privacy_setting WHERE user_id = v_user_id;
    DELETE FROM app_user_search_log WHERE user_id = v_user_id;
    DELETE FROM app_user_search_summary WHERE user_id = v_user_id;
    DELETE FROM app_user_security_audit_log WHERE user_id = v_user_id;

    -- 用户主表必须最后删除；实际重新登录时会生成新的用户 ID。
    DELETE FROM app_user WHERE id = v_user_id AND deleted = 0;
    SET v_deleted_user_count = ROW_COUNT();

    IF v_deleted_user_count <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '用户主表删除数量异常，已回滚';
    END IF;

    SELECT
        (SELECT COUNT(*) FROM app_user WHERE id = v_user_id)
      + (SELECT COUNT(*) FROM app_user_audit_record WHERE user_id = v_user_id)
      + (SELECT COUNT(*) FROM app_user_audit_history WHERE user_id = v_user_id)
      + (SELECT COUNT(*) FROM external_provider_task WHERE user_id = v_user_id)
      + (SELECT COUNT(*) FROM app_user_asset WHERE user_id = v_user_id)
      + (SELECT COUNT(*) FROM app_user_coin_log WHERE user_id = v_user_id)
      + (SELECT COUNT(*) FROM app_trade_order WHERE user_id = v_user_id)
      + (SELECT COUNT(*) FROM app_relation_like WHERE from_user_id = v_user_id OR to_user_id = v_user_id)
      + (SELECT COUNT(*) FROM app_relation_visit WHERE visitor_user_id = v_user_id OR target_user_id = v_user_id)
      + (SELECT COUNT(*) FROM app_relation_match WHERE user_low_id = v_user_id OR user_high_id = v_user_id)
      + (SELECT COUNT(*) FROM community_post WHERE author_id = v_user_id)
      + (SELECT COUNT(*) FROM community_comment WHERE author_id = v_user_id OR reply_user_id = v_user_id)
      + (SELECT COUNT(*) FROM community_follow WHERE follower_id = v_user_id OR target_user_id = v_user_id)
      + (SELECT COUNT(*) FROM community_like WHERE user_id = v_user_id)
      + (SELECT COUNT(*) FROM community_report WHERE reporter_id = v_user_id)
      + (SELECT COUNT(*) FROM promotion_invite_relation WHERE inviter_id = v_user_id OR invitee_id = v_user_id)
      + (SELECT COUNT(*) FROM promotion_reward_log WHERE inviter_id = v_user_id OR invitee_id = v_user_id)
      + (SELECT COUNT(*) FROM promotion_source_trace WHERE inviter_id = v_user_id)
      INTO v_remaining_count;

    IF v_remaining_count <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '清理后仍存在用户关联数据，已回滚';
    END IF;

    COMMIT;

    SELECT v_target_phone AS phone,
           v_user_id AS deleted_user_id,
           'CLEARED' AS reset_status,
           v_deleted_user_count AS deleted_user_count;
END $$

DELIMITER ;

CALL spacetime_reset_17366629764_full_flow();

DROP PROCEDURE IF EXISTS spacetime_reset_17366629764_full_flow;

-- 执行后回查：两项都应为 0。
SELECT COUNT(*) AS remaining_active_user_count
  FROM app_user
 WHERE CAST(phone AS BINARY) = CAST('17366629764' AS BINARY)
   AND deleted = 0;

SELECT COUNT(*) AS remaining_phone_audit_count
  FROM app_user_audit_record
 WHERE bound_phone = '17366629764';
