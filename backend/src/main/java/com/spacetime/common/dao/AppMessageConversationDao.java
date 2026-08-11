package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.AppMessageConversation;

import java.time.LocalDateTime;
import java.util.List;

/** 私信会话数据访问接口。 */
public interface AppMessageConversationDao {
    AppMessageConversation selectById(Long id);
    AppMessageConversation selectByConversationNo(String conversationNo);
    AppMessageConversation selectByConversationNoForUpdate(String conversationNo);
    AppMessageConversation selectByMatchIdForUpdate(Long matchId);
    AppMessageConversation selectActivePair(Long userLowId, Long userHighId);
    AppMessageConversation selectLatestPair(Long userLowId, Long userHighId);
    AppMessageConversation selectActivePairForUpdate(Long userLowId, Long userHighId);
    List<AppMessageConversation> selectActiveByUser(Long userId, LocalDateTime cursorTime,
                                                     Long cursorId, int size);
    Page<AppMessageConversation> selectPage(Page<AppMessageConversation> page,
                                             LambdaQueryWrapper<AppMessageConversation> wrapper);
    int invalidateByUser(Long userId, String status, String reason, LocalDateTime invalidTime);
    int invalidateByPair(Long userLowId, Long userHighId, String status, String reason,
                         Long blockedByUserId, LocalDateTime invalidTime);
    int touchMessage(Long id, Long messageId, LocalDateTime messageTime,
                     boolean femaleFirstMessage);
    void insert(AppMessageConversation entity);
    void updateById(AppMessageConversation entity);
}
