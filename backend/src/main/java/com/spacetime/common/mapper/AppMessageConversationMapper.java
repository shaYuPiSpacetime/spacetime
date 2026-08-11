package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppMessageConversation;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

/** 私信会话 Mapper。 */
@Mapper
public interface AppMessageConversationMapper extends BaseMapper<AppMessageConversation> {
    @Select("SELECT * FROM app_message_conversation WHERE conversation_no=#{conversationNo} "
            + "AND deleted=0 LIMIT 1 FOR UPDATE")
    AppMessageConversation selectByConversationNoForUpdate(@Param("conversationNo") String conversationNo);

    @Select("SELECT * FROM app_message_conversation WHERE match_id=#{matchId} AND deleted=0 LIMIT 1 FOR UPDATE")
    AppMessageConversation selectByMatchIdForUpdate(@Param("matchId") Long matchId);

    @Select("SELECT * FROM app_message_conversation WHERE user_low_id=#{userLowId} "
            + "AND user_high_id=#{userHighId} AND status='active' AND active_marker=1 "
            + "AND deleted=0 LIMIT 1 FOR UPDATE")
    AppMessageConversation selectActivePairForUpdate(@Param("userLowId") Long userLowId,
                                                     @Param("userHighId") Long userHighId);

    @Update("UPDATE app_message_conversation SET "
            + "last_message_id=CASE WHEN last_message_time IS NULL OR last_message_time<=#{messageTime} "
            + "THEN #{messageId} ELSE last_message_id END, "
            + "last_message_time=CASE WHEN last_message_time IS NULL OR last_message_time<=#{messageTime} "
            + "THEN #{messageTime} ELSE last_message_time END, "
            + "female_first_message_at=CASE WHEN #{femaleFirstMessage}=TRUE "
            + "AND female_first_message_at IS NULL THEN #{messageTime} ELSE female_first_message_at END, "
            + "version=version+1, update_time=#{messageTime} WHERE id=#{id} AND deleted=0")
    int touchMessage(@Param("id") Long id,
                     @Param("messageId") Long messageId,
                     @Param("messageTime") java.time.LocalDateTime messageTime,
                     @Param("femaleFirstMessage") boolean femaleFirstMessage);

    @Update("UPDATE app_message_conversation c "
            + "LEFT JOIN app_message_rule_version r ON r.version_no=c.config_version AND r.deleted=0 "
            + "SET c.status=#{status}, c.active_marker=NULL, c.invalid_reason=#{reason}, "
            + "c.invalid_time=#{invalidTime}, c.isolated_at=#{invalidTime}, "
            + "c.purge_after=COALESCE(c.purge_after, DATE_ADD(#{invalidTime}, "
            + "INTERVAL COALESCE(r.ordinary_message_retain_days,180) DAY)), "
            + "c.version=c.version+1, c.update_time=#{invalidTime} WHERE c.status='active' "
            + "AND (c.user_low_id=#{userId} OR c.user_high_id=#{userId}) AND c.deleted=0")
    int invalidateByUser(@Param("userId") Long userId,
                         @Param("status") String status,
                         @Param("reason") String reason,
                         @Param("invalidTime") java.time.LocalDateTime invalidTime);

    @Update("UPDATE app_message_conversation c "
            + "LEFT JOIN app_message_rule_version r ON r.version_no=c.config_version AND r.deleted=0 "
            + "SET c.status=#{status}, c.active_marker=NULL, c.blocked_by_user_id=#{blockedByUserId}, "
            + "c.invalid_reason=#{reason}, c.invalid_time=#{invalidTime}, c.isolated_at=#{invalidTime}, "
            + "c.purge_after=COALESCE(c.purge_after, DATE_ADD(#{invalidTime}, "
            + "INTERVAL COALESCE(r.ordinary_message_retain_days,180) DAY)), "
            + "c.version=c.version+1, c.update_time=#{invalidTime} WHERE c.status='active' "
            + "AND c.user_low_id=#{userLowId} AND c.user_high_id=#{userHighId} AND c.deleted=0")
    int invalidateByPair(@Param("userLowId") Long userLowId,
                         @Param("userHighId") Long userHighId,
                         @Param("status") String status,
                         @Param("reason") String reason,
                         @Param("blockedByUserId") Long blockedByUserId,
                         @Param("invalidTime") java.time.LocalDateTime invalidTime);
}
