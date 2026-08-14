package com.spacetime.common.dao;

import com.spacetime.common.entity.AppMessageConversationMember;

import java.time.LocalDateTime;

/** 私信会话成员数据访问接口。 */
public interface AppMessageConversationMemberDao {
    AppMessageConversationMember selectByConversationAndUser(Long conversationId, Long userId);
    AppMessageConversationMember selectByConversationAndUserForUpdate(Long conversationId, Long userId);
    java.util.List<AppMessageConversationMember> selectByUserAndConversations(
            Long userId, java.util.List<Long> conversationIds);
    int advanceReadWatermark(Long conversationId, Long userId,
                             LocalDateTime lastReadMessageTime, LocalDateTime readAt);
    void insert(AppMessageConversationMember entity);
    void updateById(AppMessageConversationMember entity);
}
