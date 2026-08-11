package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.AppMessageConversationDao;
import com.spacetime.common.entity.AppMessageConversation;
import com.spacetime.common.enums.MessageConversationStatusEnum;
import com.spacetime.common.mapper.AppMessageConversationMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/** 私信会话数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class AppMessageConversationDaoImpl implements AppMessageConversationDao {
    private final AppMessageConversationMapper mapper;

    @Override
    public AppMessageConversation selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public AppMessageConversation selectByConversationNo(String conversationNo) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageConversation>()
                .eq(AppMessageConversation::getConversationNo, conversationNo));
    }

    @Override
    public Page<AppMessageConversation> selectPage(Page<AppMessageConversation> page,
                                                    LambdaQueryWrapper<AppMessageConversation> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public AppMessageConversation selectByConversationNoForUpdate(String conversationNo) {
        return mapper.selectByConversationNoForUpdate(conversationNo);
    }

    @Override
    public AppMessageConversation selectByMatchIdForUpdate(Long matchId) {
        return mapper.selectByMatchIdForUpdate(matchId);
    }

    @Override
    public AppMessageConversation selectActivePair(Long userLowId, Long userHighId) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageConversation>()
                .eq(AppMessageConversation::getUserLowId, userLowId)
                .eq(AppMessageConversation::getUserHighId, userHighId)
                .eq(AppMessageConversation::getStatus, MessageConversationStatusEnum.ACTIVE.getCode())
                .eq(AppMessageConversation::getActiveMarker, 1));
    }

    @Override
    public AppMessageConversation selectLatestPair(Long userLowId, Long userHighId) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageConversation>()
                .eq(AppMessageConversation::getUserLowId, userLowId)
                .eq(AppMessageConversation::getUserHighId, userHighId)
                .orderByDesc(AppMessageConversation::getId)
                .last("LIMIT 1"));
    }

    @Override
    public AppMessageConversation selectActivePairForUpdate(Long userLowId, Long userHighId) {
        return mapper.selectActivePairForUpdate(userLowId, userHighId);
    }

    @Override
    public List<AppMessageConversation> selectActiveByUser(Long userId, LocalDateTime cursorTime,
                                                            Long cursorId, int size) {
        return mapper.selectList(new LambdaQueryWrapper<AppMessageConversation>()
                .eq(AppMessageConversation::getStatus, MessageConversationStatusEnum.ACTIVE.getCode())
                .and(query -> query.eq(AppMessageConversation::getUserLowId, userId)
                        .or().eq(AppMessageConversation::getUserHighId, userId))
                .and(cursorTime != null && cursorId != null, query -> query
                        .lt(AppMessageConversation::getLastMessageTime, cursorTime)
                        .or(nested -> nested
                                .eq(AppMessageConversation::getLastMessageTime, cursorTime)
                                .lt(AppMessageConversation::getId, cursorId)))
                .orderByDesc(AppMessageConversation::getLastMessageTime)
                .orderByDesc(AppMessageConversation::getId)
                .last("LIMIT " + Math.max(1, Math.min(size, 51))));
    }

    @Override
    public int invalidateByUser(Long userId, String status, String reason,
                                LocalDateTime invalidTime) {
        return mapper.invalidateByUser(userId, status, reason, invalidTime);
    }

    @Override
    public int invalidateByPair(Long userLowId, Long userHighId, String status, String reason,
                                Long blockedByUserId, LocalDateTime invalidTime) {
        return mapper.invalidateByPair(
                userLowId, userHighId, status, reason, blockedByUserId, invalidTime);
    }

    @Override
    public int touchMessage(Long id, Long messageId, LocalDateTime messageTime,
                            boolean femaleFirstMessage) {
        return mapper.touchMessage(id, messageId, messageTime, femaleFirstMessage);
    }

    @Override
    public void insert(AppMessageConversation entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(AppMessageConversation entity) {
        mapper.updateById(entity);
    }
}
