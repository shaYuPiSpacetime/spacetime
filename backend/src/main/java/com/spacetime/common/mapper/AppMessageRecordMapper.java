package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppMessageRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;

/** 私信消息事实 Mapper。 */
@Mapper
public interface AppMessageRecordMapper extends BaseMapper<AppMessageRecord> {
    @Update("UPDATE app_message_record SET send_status='sent', tim_message_id=#{timMessageId}, "
            + "tim_msg_key=#{timMsgKey}, provider_sent_at=#{providerSentAt}, sent_at=#{providerSentAt}, "
            + "receiver_read_status='unread', receiver_read_at=NULL, "
            + "failure_code=NULL, failure_reason=NULL, version=version+1, update_time=#{providerSentAt} "
            + "WHERE id=#{id} AND version=#{expectedVersion} AND send_status='queued' AND deleted=0 "
            + "AND (tim_msg_key IS NULL OR tim_msg_key=#{timMsgKey})")
    int confirmTimMapping(@Param("id") Long id,
                          @Param("expectedVersion") int expectedVersion,
                          @Param("timMessageId") String timMessageId,
                          @Param("timMsgKey") String timMsgKey,
                          @Param("providerSentAt") LocalDateTime providerSentAt);

    @Update("UPDATE app_message_record SET send_status='failed', failure_code=#{failureCode}, "
            + "failure_reason=#{failureReason}, receiver_read_status='not_applicable', "
            + "receiver_read_at=NULL, version=version+1, update_time=#{failedAt} "
            + "WHERE id=#{id} AND version=#{expectedVersion} AND send_status='queued' AND deleted=0")
    int markFailed(@Param("id") Long id,
                   @Param("expectedVersion") int expectedVersion,
                   @Param("failureCode") String failureCode,
                   @Param("failureReason") String failureReason,
                   @Param("failedAt") LocalDateTime failedAt);

    @Update("UPDATE app_message_record SET conversation_id=#{conversationId}, "
            + "conversation_no=#{conversationNo}, update_time=#{updatedAt} "
            + "WHERE id=#{id} AND deleted=0 AND (conversation_id IS NULL OR "
            + "(conversation_id=#{conversationId} AND conversation_no=#{conversationNo}))")
    int bindConversation(@Param("id") Long id,
                         @Param("conversationId") Long conversationId,
                         @Param("conversationNo") String conversationNo,
                         @Param("updatedAt") LocalDateTime updatedAt);

    @Update("UPDATE app_message_record SET content_text=NULL, content_cleared_at=#{now}, "
            + "update_time=#{now} WHERE content_text IS NOT NULL AND content_cleared_at IS NULL "
            + "AND purge_after IS NOT NULL AND purge_after<=#{now} AND deleted=0 "
            + "ORDER BY purge_after,id LIMIT #{limit}")
    int clearExpiredContent(@Param("now") LocalDateTime now, @Param("limit") int limit);

    @Update("UPDATE app_message_record m "
            + "LEFT JOIN app_message_conversation c ON c.id=m.conversation_id AND c.deleted=0 "
            + "LEFT JOIN app_message_whisper w ON (w.request_message_id=m.id OR w.reply_message_id=m.id) "
            + "AND w.deleted=0 SET m.isolated_at=COALESCE(m.isolated_at,#{invalidTime}), "
            + "m.purge_after=COALESCE(m.purge_after,c.purge_after,w.purge_after,"
            + "DATE_ADD(#{invalidTime},INTERVAL 180 DAY)), m.update_time=#{invalidTime} "
            + "WHERE (m.sender_user_id=#{userId} OR m.receiver_user_id=#{userId}) AND m.deleted=0")
    int schedulePurgeByUser(@Param("userId") Long userId,
                            @Param("invalidTime") LocalDateTime invalidTime);

    @Update("UPDATE app_message_record m "
            + "LEFT JOIN app_message_conversation c ON c.id=m.conversation_id AND c.deleted=0 "
            + "LEFT JOIN app_message_whisper w ON (w.request_message_id=m.id OR w.reply_message_id=m.id) "
            + "AND w.deleted=0 SET m.isolated_at=COALESCE(m.isolated_at,#{invalidTime}), "
            + "m.purge_after=COALESCE(m.purge_after,c.purge_after,w.purge_after,"
            + "DATE_ADD(#{invalidTime},INTERVAL 180 DAY)), m.update_time=#{invalidTime} "
            + "WHERE ((m.sender_user_id=#{userLowId} AND m.receiver_user_id=#{userHighId}) "
            + "OR (m.sender_user_id=#{userHighId} AND m.receiver_user_id=#{userLowId})) AND m.deleted=0")
    int schedulePurgeByPair(@Param("userLowId") Long userLowId,
                            @Param("userHighId") Long userHighId,
                            @Param("invalidTime") LocalDateTime invalidTime);

    @Update("UPDATE app_message_record m "
            + "LEFT JOIN app_message_whisper w ON w.whisper_no=m.source_biz_no AND w.deleted=0 "
            + "LEFT JOIN app_message_rule_version r ON r.version_no=w.config_version AND r.deleted=0 "
            + "SET m.isolated_at=COALESCE(m.isolated_at,#{terminalTime}), "
            + "m.purge_after=COALESCE(m.purge_after,w.purge_after,DATE_ADD(#{terminalTime}, "
            + "INTERVAL COALESCE(r.ordinary_message_retain_days,180) DAY)), "
            + "m.update_time=#{terminalTime} WHERE m.id=#{messageId} AND m.deleted=0")
    int schedulePurgeByMessageId(@Param("messageId") Long messageId,
                                 @Param("terminalTime") LocalDateTime terminalTime);

    @Update("UPDATE app_message_record m "
            + "JOIN app_message_whisper w ON (w.request_message_id=m.id OR w.reply_message_id=m.id) "
            + "SET m.isolated_at=COALESCE(m.isolated_at,w.isolated_at), "
            + "m.purge_after=COALESCE(m.purge_after,w.purge_after), m.update_time=#{terminalTime} "
            + "WHERE w.update_time=#{terminalTime} AND w.status IN ('expired','invalid') "
            + "AND w.purge_after IS NOT NULL AND w.deleted=0 AND m.deleted=0 AND m.purge_after IS NULL")
    int schedulePurgeForTerminalWhispers(@Param("terminalTime") LocalDateTime terminalTime);

    @Update("UPDATE app_message_record SET receiver_read_status='read', receiver_read_at=#{readAt}, "
            + "update_time=#{readAt} WHERE conversation_id=#{conversationId} "
            + "AND receiver_user_id=#{receiverUserId} AND id<=#{lastMessageId} "
            + "AND send_status='sent' AND receiver_read_status='unread' AND deleted=0")
    int markReadThrough(@Param("conversationId") Long conversationId,
                        @Param("receiverUserId") Long receiverUserId,
                        @Param("lastMessageId") Long lastMessageId,
                        @Param("readAt") LocalDateTime readAt);

    @Update("UPDATE app_message_record SET receiver_read_status='read', receiver_read_at=#{readAt}, "
            + "update_time=#{readAt} WHERE conversation_id=#{conversationId} "
            + "AND receiver_user_id=#{receiverUserId} AND sender_user_id=#{senderUserId} "
            + "AND sent_at<=#{lastReadTime} AND send_status='sent' "
            + "AND receiver_read_status='unread' AND deleted=0")
    int markReadThroughTime(@Param("conversationId") Long conversationId,
                            @Param("receiverUserId") Long receiverUserId,
                            @Param("senderUserId") Long senderUserId,
                            @Param("lastReadTime") LocalDateTime lastReadTime,
                            @Param("readAt") LocalDateTime readAt);

    @Select("SELECT COUNT(1) FROM app_message_record WHERE conversation_id=#{conversationId} "
            + "AND receiver_user_id=#{receiverUserId} AND sender_user_id<>#{receiverUserId} "
            + "AND message_type IN ('text','whisper','whisper_reply') "
            + "AND send_status='sent' AND content_text IS NOT NULL AND deleted=0")
    long countReportableIncomingText(@Param("conversationId") Long conversationId,
                                     @Param("receiverUserId") Long receiverUserId);
}
