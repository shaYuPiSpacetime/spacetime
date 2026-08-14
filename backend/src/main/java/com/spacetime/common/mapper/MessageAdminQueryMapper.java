package com.spacetime.common.mapper;

import com.spacetime.common.model.message.MessageAdminRecordFilter;
import com.spacetime.common.model.message.MessageAdminRecordProjection;
import com.spacetime.common.model.message.MessageAdminRecordStatsProjection;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/** 跨消息事实表的后台只读元数据查询；SQL 明确不选择任何正文或密文字段。 */
@Mapper
public interface MessageAdminQueryMapper {
    String RECORD_UNION = """
            (
                SELECT m.message_no AS record_no,
                       CASE WHEN m.message_type IN ('whisper', 'whisper_request', 'whisper_reply')
                            THEN 'whisper_message' ELSE 'private_message' END AS record_type,
                       m.sender_user_id AS user_id,
                       m.receiver_user_id AS peer_user_id,
                       m.message_type AS message_type,
                       NULL AS system_category,
                       m.send_status AS status,
                       COALESCE(m.sent_at, m.provider_sent_at, m.create_time) AS business_time,
                       m.conversation_no AS conversation_no,
                       m.source_biz_no AS source_biz_no,
                       m.tim_message_id AS tim_message_id,
                       m.tim_msg_key AS tim_msg_key,
                       m.failure_code AS failure_code,
                       m.failure_reason AS failure_reason,
                       m.content_cleared_at AS content_cleared_at
                  FROM app_message_record m
                 WHERE m.deleted = 0
                UNION ALL
                SELECT s.notice_no AS record_no,
                       'system_message' AS record_type,
                       s.receiver_user_id AS user_id,
                       NULL AS peer_user_id,
                       'system' AS message_type,
                       s.notification_type AS system_category,
                       CASE WHEN s.read_at IS NULL THEN 'unread' ELSE 'read' END AS status,
                       s.create_time AS business_time,
                       NULL AS conversation_no,
                       s.biz_no AS source_biz_no,
                       NULL AS tim_message_id,
                       NULL AS tim_msg_key,
                       NULL AS failure_code,
                       NULL AS failure_reason,
                       NULL AS content_cleared_at
                  FROM app_system_message s
                 WHERE s.deleted = 0
                UNION ALL
                SELECT a.assistant_message_no AS record_no,
                       'assistant_message' AS record_type,
                       a.receiver_user_id AS user_id,
                       NULL AS peer_user_id,
                       'assistant' AS message_type,
                       'assistant' AS system_category,
                       CASE WHEN a.read_at IS NULL THEN 'unread' ELSE 'read' END AS status,
                       COALESCE(a.visible_from, a.create_time) AS business_time,
                       NULL AS conversation_no,
                       a.topic_code AS source_biz_no,
                       NULL AS tim_message_id,
                       NULL AS tim_msg_key,
                       NULL AS failure_code,
                       NULL AS failure_reason,
                       NULL AS content_cleared_at
                  FROM app_assistant_message a
                 WHERE a.deleted = 0
            ) records
            """;

    String FILTER = """
            <where>
              <if test="filter.keyword != null and filter.keyword != ''">
                AND (records.record_no LIKE CONCAT('%', #{filter.keyword}, '%')
                  OR records.conversation_no LIKE CONCAT('%', #{filter.keyword}, '%')
                  OR records.source_biz_no LIKE CONCAT('%', #{filter.keyword}, '%')
                  OR CAST(records.user_id AS CHAR) = #{filter.keyword}
                  OR CAST(records.peer_user_id AS CHAR) = #{filter.keyword}
                  OR EXISTS (
                      SELECT 1
                        FROM app_user keyword_user
                       WHERE keyword_user.deleted = 0
                         AND keyword_user.id IN (records.user_id, records.peer_user_id)
                         AND keyword_user.nickname LIKE CONCAT('%', #{filter.keyword}, '%')
                  ))
              </if>
              <if test="filter.recordType != null and filter.recordType != ''">
                AND records.record_type = #{filter.recordType}
              </if>
              <if test="filter.messageType != null and filter.messageType != ''">
                AND records.message_type = #{filter.messageType}
              </if>
              <if test="filter.systemCategory != null and filter.systemCategory != ''">
                AND records.system_category = #{filter.systemCategory}
              </if>
              <if test="filter.status != null and filter.status != ''">
                AND records.status = #{filter.status}
              </if>
              <if test="filter.startTime != null">
                AND records.business_time &gt;= #{filter.startTime}
              </if>
              <if test="filter.endTime != null">
                AND records.business_time &lt;= #{filter.endTime}
              </if>
            </where>
            """;

    @Select({"<script>",
            "SELECT records.record_no AS recordNo, records.record_type AS recordType,",
            "records.user_id AS userId, records.peer_user_id AS peerUserId,",
            "records.message_type AS messageType, records.system_category AS systemCategory,",
            "records.status AS status, records.business_time AS businessTime,",
            "records.conversation_no AS conversationNo, records.source_biz_no AS sourceBizNo,",
            "records.tim_message_id AS timMessageId, records.tim_msg_key AS timMsgKey,",
            "records.failure_code AS failureCode, records.failure_reason AS failureReason,",
            "records.content_cleared_at AS contentClearedAt, COALESCE(c.case_count, 0) AS caseCount",
            "FROM", RECORD_UNION,
            "LEFT JOIN (SELECT target_biz_no, COUNT(*) AS case_count FROM community_report",
            "WHERE deleted = 0 AND target_biz_no IS NOT NULL GROUP BY target_biz_no) c",
            "ON c.target_biz_no = records.record_no",
            FILTER,
            "ORDER BY records.business_time DESC, records.record_no DESC",
            "LIMIT #{offset}, #{limit}",
            "</script>"})
    List<MessageAdminRecordProjection> selectPage(@Param("filter") MessageAdminRecordFilter filter,
                                                   @Param("offset") int offset,
                                                   @Param("limit") int limit);

    @Select({"<script>", "SELECT COUNT(*) FROM", RECORD_UNION, FILTER, "</script>"})
    long count(@Param("filter") MessageAdminRecordFilter filter);

    @Select({"SELECT",
            "(SELECT COUNT(*) FROM app_message_record m WHERE m.deleted = 0",
            " AND m.message_type NOT IN ('whisper','whisper_request','whisper_reply')",
            " AND COALESCE(m.sent_at,m.provider_sent_at,m.create_time) >= CURRENT_DATE",
            " AND COALESCE(m.sent_at,m.provider_sent_at,m.create_time) < DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)) AS todayPrivateMessageCount,",
            "(SELECT COUNT(*) FROM app_message_whisper w WHERE w.deleted = 0 AND w.status = 'pending'",
            " AND (w.expires_at IS NULL OR w.expires_at > NOW())) AS waitingWhisperCount,",
            "(SELECT COUNT(*) FROM app_system_message s WHERE s.deleted = 0",
            " AND (s.visible_until IS NULL OR s.visible_until > NOW())) AS systemMessageCount,",
            "(SELECT COUNT(DISTINCT cr.target_biz_no) FROM community_report cr",
            " WHERE cr.deleted = 0 AND cr.target_biz_no IS NOT NULL",
            " AND (cr.target_type IN ('message','conversation','whisper','chat')",
            " OR cr.source_scene IN ('chat','whisper'))) AS caseLinkedCount"})
    MessageAdminRecordStatsProjection stats();

    @Select({"SELECT records.record_no AS recordNo, records.record_type AS recordType,",
            "records.user_id AS userId, records.peer_user_id AS peerUserId,",
            "records.message_type AS messageType, records.system_category AS systemCategory,",
            "records.status AS status, records.business_time AS businessTime,",
            "records.conversation_no AS conversationNo, records.source_biz_no AS sourceBizNo,",
            "records.tim_message_id AS timMessageId, records.tim_msg_key AS timMsgKey,",
            "records.failure_code AS failureCode, records.failure_reason AS failureReason,",
            "records.content_cleared_at AS contentClearedAt,",
            "(SELECT COUNT(*) FROM community_report cr WHERE cr.deleted = 0",
            "AND cr.target_biz_no = records.record_no) AS caseCount",
            "FROM", RECORD_UNION,
            "WHERE records.record_no = #{recordNo} LIMIT 1"})
    MessageAdminRecordProjection selectByRecordNo(@Param("recordNo") String recordNo);
}
