package com.spacetime.common.mapper;

import com.spacetime.common.model.message.AppUserPlatformMessageProjection;
import com.spacetime.common.model.message.AppUserPrivateMessageProjection;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

/** App 用户消息互动专用查询；列表 SQL 明确排除所有正文和密文字段。 */
@Mapper
public interface AppUserMessageAdminQueryMapper {
    String PRIVATE_FILTER = """
             FROM app_message_record m
            WHERE m.deleted = 0
              AND (m.sender_user_id = #{userId} OR m.receiver_user_id = #{userId})
              AND m.conversation_id IS NOT NULL
              AND m.message_type IN ('text', 'whisper_reply')
            """;

    String PLATFORM_UNION = """
            (
                SELECT s.notice_no AS record_no, 'system' AS channel,
                       s.notification_type AS category, s.biz_type AS biz_type,
                       s.biz_no AS biz_no,
                       CASE WHEN s.read_at IS NULL THEN 'unread' ELSE 'read' END AS read_status,
                       s.jump_type AS action_type, s.visible_until AS visible_until,
                       s.create_time AS business_time
                  FROM app_system_message s
                 WHERE s.deleted = 0 AND s.receiver_user_id = #{userId}
                UNION ALL
                SELECT a.assistant_message_no AS record_no, 'assistant' AS channel,
                       a.topic_code AS category, a.topic_code AS biz_type,
                       NULL AS biz_no,
                       CASE WHEN a.read_at IS NULL THEN 'unread' ELSE 'read' END AS read_status,
                       a.action_type AS action_type, a.visible_until AS visible_until,
                       COALESCE(a.visible_from, a.create_time) AS business_time
                  FROM app_assistant_message a
                 WHERE a.deleted = 0 AND a.receiver_user_id = #{userId}
            ) platform_records
            """;

    @Select({"SELECT m.message_no AS messageNo, m.sender_user_id AS senderUserId,",
            "m.receiver_user_id AS receiverUserId, m.message_type AS messageType,",
            "m.conversation_no AS conversationNo, m.send_status AS sendStatus,",
            "m.receiver_read_status AS receiverReadStatus, m.receiver_read_at AS receiverReadAt,",
            "m.failure_code AS failureCode, m.failure_reason AS failureReason,",
            "COALESCE(m.sent_at, m.provider_sent_at, m.create_time) AS businessTime,",
            "m.content_cleared_at AS contentClearedAt,",
            "CASE WHEN m.content_cleared_at IS NULL THEN TRUE ELSE FALSE END AS contentAvailable",
            PRIVATE_FILTER,
            "ORDER BY businessTime DESC, m.id DESC LIMIT #{offset}, #{limit}"})
    List<AppUserPrivateMessageProjection> selectPrivateMessages(
            @Param("userId") Long userId, @Param("offset") int offset, @Param("limit") int limit);

    @Select({"SELECT COUNT(*)", PRIVATE_FILTER})
    long countPrivateMessages(@Param("userId") Long userId);

    @Select({"SELECT COUNT(*) FROM app_message_record m",
            "WHERE m.deleted=0 AND m.receiver_user_id=#{userId}",
            "AND m.conversation_id IS NOT NULL AND m.sender_type='user'",
            "AND m.message_type IN ('text','whisper_reply') AND m.send_status='sent'",
            "AND m.receiver_read_status='unread' AND m.isolated_at IS NULL"})
    long countPrivateUnread(@Param("userId") Long userId);

    @Select({"SELECT platform_records.record_no AS recordNo, platform_records.channel AS channel,",
            "platform_records.category AS category, platform_records.biz_type AS bizType,",
            "platform_records.biz_no AS bizNo, platform_records.read_status AS readStatus,",
            "platform_records.action_type AS actionType, platform_records.visible_until AS visibleUntil,",
            "platform_records.business_time AS businessTime FROM", PLATFORM_UNION,
            "ORDER BY platform_records.business_time DESC, platform_records.record_no DESC",
            "LIMIT #{offset}, #{limit}"})
    List<AppUserPlatformMessageProjection> selectPlatformMessages(
            @Param("userId") Long userId, @Param("offset") int offset, @Param("limit") int limit);

    @Select({"SELECT COUNT(*) FROM", PLATFORM_UNION})
    long countPlatformMessages(@Param("userId") Long userId);

    @Select({"SELECT COUNT(*) FROM app_system_message s WHERE s.deleted=0",
            "AND s.receiver_user_id=#{userId} AND s.read_at IS NULL AND s.visible_until>#{now}"})
    long countSystemUnread(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    @Select({"SELECT COUNT(*) FROM app_assistant_message a WHERE a.deleted=0",
            "AND a.receiver_user_id=#{userId} AND a.read_at IS NULL",
            "AND a.visible_from<=#{now} AND (a.visible_until IS NULL OR a.visible_until>#{now})"})
    long countAssistantUnread(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}
