package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppMessageConversationMember;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

/** 私信会话成员 Mapper。 */
@Mapper
public interface AppMessageConversationMemberMapper extends BaseMapper<AppMessageConversationMember> {
    @Select("SELECT * FROM app_message_conversation_member WHERE conversation_id=#{conversationId} "
            + "AND user_id=#{userId} AND deleted=0 LIMIT 1 FOR UPDATE")
    AppMessageConversationMember selectByConversationAndUserForUpdate(
            @Param("conversationId") Long conversationId,
            @Param("userId") Long userId);

    @Update("UPDATE app_message_conversation_member SET "
            + "last_read_at=CASE WHEN last_read_at IS NULL OR last_read_at<#{readAt} "
            + "THEN #{readAt} ELSE last_read_at END, "
            + "last_read_message_time=CASE WHEN last_read_message_time IS NULL "
            + "OR last_read_message_time<#{lastReadMessageTime} THEN #{lastReadMessageTime} "
            + "ELSE last_read_message_time END, version=version+1, "
            + "update_time=CASE WHEN update_time IS NULL OR update_time<#{readAt} "
            + "THEN #{readAt} ELSE update_time END WHERE conversation_id=#{conversationId} "
            + "AND user_id=#{userId} AND deleted=0 AND (last_read_message_time IS NULL "
            + "OR last_read_message_time<#{lastReadMessageTime} OR "
            + "(last_read_message_time=#{lastReadMessageTime} "
            + "AND (last_read_at IS NULL OR last_read_at<#{readAt})))")
    int advanceReadWatermark(@Param("conversationId") Long conversationId,
                             @Param("userId") Long userId,
                             @Param("lastReadMessageTime") java.time.LocalDateTime lastReadMessageTime,
                             @Param("readAt") java.time.LocalDateTime readAt);

}
