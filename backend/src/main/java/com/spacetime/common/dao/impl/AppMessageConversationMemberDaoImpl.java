package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.AppMessageConversationMemberDao;
import com.spacetime.common.entity.AppMessageConversationMember;
import com.spacetime.common.mapper.AppMessageConversationMemberMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** 私信会话成员数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class AppMessageConversationMemberDaoImpl implements AppMessageConversationMemberDao {
    private final AppMessageConversationMemberMapper mapper;

    @Override
    public AppMessageConversationMember selectByConversationAndUser(Long conversationId, Long userId) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageConversationMember>()
                .eq(AppMessageConversationMember::getConversationId, conversationId)
                .eq(AppMessageConversationMember::getUserId, userId));
    }

    @Override
    public AppMessageConversationMember selectByConversationAndUserForUpdate(
            Long conversationId, Long userId) {
        return mapper.selectByConversationAndUserForUpdate(conversationId, userId);
    }

    @Override
    public java.util.List<AppMessageConversationMember> selectByUserAndConversations(
            Long userId, java.util.List<Long> conversationIds) {
        if (conversationIds == null || conversationIds.isEmpty()) {
            return java.util.List.of();
        }
        return mapper.selectList(new LambdaQueryWrapper<AppMessageConversationMember>()
                .eq(AppMessageConversationMember::getUserId, userId)
                .in(AppMessageConversationMember::getConversationId, conversationIds));
    }

    @Override
    public int advanceReadWatermark(Long conversationId, Long userId,
                                    java.time.LocalDateTime lastReadMessageTime,
                                    java.time.LocalDateTime readAt) {
        return mapper.advanceReadWatermark(conversationId, userId, lastReadMessageTime, readAt);
    }

    @Override
    public void insert(AppMessageConversationMember entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppMessageConversationMember entity) {
        mapper.updateById(entity);
    }

}
