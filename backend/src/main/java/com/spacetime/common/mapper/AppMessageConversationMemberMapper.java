package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppMessageConversationMember;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/** 私信会话成员 Mapper。 */
@Mapper
public interface AppMessageConversationMemberMapper extends BaseMapper<AppMessageConversationMember> {
    @Select("SELECT * FROM app_message_conversation_member WHERE conversation_id=#{conversationId} "
            + "AND user_id=#{userId} AND deleted=0 LIMIT 1 FOR UPDATE")
    AppMessageConversationMember selectByConversationAndUserForUpdate(
            @Param("conversationId") Long conversationId,
            @Param("userId") Long userId);

}
