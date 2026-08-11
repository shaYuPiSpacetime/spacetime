package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.spacetime.common.dao.AppMessageRecordDao;
import com.spacetime.common.entity.AppMessageRecord;
import com.spacetime.common.enums.MessageSendStatusEnum;
import com.spacetime.common.enums.MessageReadStatusEnum;
import com.spacetime.common.mapper.AppMessageRecordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

/** 私信消息事实数据访问实现。 */
@Repository
@RequiredArgsConstructor
public class AppMessageRecordDaoImpl implements AppMessageRecordDao {
    private final AppMessageRecordMapper mapper;

    @Override
    public AppMessageRecord selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public List<AppMessageRecord> selectByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return mapper.selectByIds(ids);
    }

    @Override
    public AppMessageRecord selectByMessageNo(String messageNo) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageRecord>()
                .eq(AppMessageRecord::getMessageNo, messageNo));
    }

    @Override
    public AppMessageRecord selectBySenderClientMsgId(Long senderUserId, String clientMsgId) {
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageRecord>()
                .eq(AppMessageRecord::getSenderUserId, senderUserId)
                .eq(AppMessageRecord::getClientMsgId, clientMsgId));
    }

    @Override
    public AppMessageRecord selectByTimMsgKey(String timMsgKey) {
        if (timMsgKey == null || timMsgKey.isBlank()) {
            return null;
        }
        return mapper.selectOne(new LambdaQueryWrapper<AppMessageRecord>()
                .eq(AppMessageRecord::getTimMsgKey, timMsgKey));
    }

    @Override
    public long countUnreadAfter(Long conversationId, Long receiverUserId, Long messageId) {
        return mapper.selectCount(new LambdaQueryWrapper<AppMessageRecord>()
                .eq(AppMessageRecord::getConversationId, conversationId)
                .eq(AppMessageRecord::getReceiverUserId, receiverUserId)
                .eq(AppMessageRecord::getSendStatus, MessageSendStatusEnum.SENT.getCode())
                .gt(AppMessageRecord::getId, messageId));
    }

    @Override
    public long countUnreadByReceiver(Long receiverUserId) {
        return mapper.selectCount(new LambdaQueryWrapper<AppMessageRecord>()
                .eq(AppMessageRecord::getReceiverUserId, receiverUserId)
                .isNotNull(AppMessageRecord::getConversationId)
                .eq(AppMessageRecord::getSenderType, "user")
                .in(AppMessageRecord::getMessageType, "text", "whisper_reply")
                .eq(AppMessageRecord::getSendStatus, MessageSendStatusEnum.SENT.getCode())
                .eq(AppMessageRecord::getReceiverReadStatus, MessageReadStatusEnum.UNREAD.getCode())
                .isNull(AppMessageRecord::getIsolatedAt));
    }

    @Override
    public long countUnreadByConversation(Long conversationId, Long receiverUserId) {
        return mapper.selectCount(new LambdaQueryWrapper<AppMessageRecord>()
                .eq(AppMessageRecord::getConversationId, conversationId)
                .eq(AppMessageRecord::getReceiverUserId, receiverUserId)
                .eq(AppMessageRecord::getSenderType, "user")
                .in(AppMessageRecord::getMessageType, "text", "whisper_reply")
                .eq(AppMessageRecord::getSendStatus, MessageSendStatusEnum.SENT.getCode())
                .eq(AppMessageRecord::getReceiverReadStatus, MessageReadStatusEnum.UNREAD.getCode())
                .isNull(AppMessageRecord::getIsolatedAt));
    }

    @Override
    public List<AppMessageRecord> selectHistory(Long conversationId, Long beforeId, int size) {
        return mapper.selectList(new LambdaQueryWrapper<AppMessageRecord>()
                .eq(AppMessageRecord::getConversationId, conversationId)
                .eq(AppMessageRecord::getSendStatus, MessageSendStatusEnum.SENT.getCode())
                .lt(beforeId != null, AppMessageRecord::getId, beforeId)
                .orderByDesc(AppMessageRecord::getId)
                .last("LIMIT " + Math.max(1, Math.min(size, 51))));
    }

    @Override
    public List<AppMessageRecord> selectSentBefore(Long conversationId, Long messageId, int size) {
        return mapper.selectList(new LambdaQueryWrapper<AppMessageRecord>()
                .eq(AppMessageRecord::getConversationId, conversationId)
                .eq(AppMessageRecord::getSendStatus, MessageSendStatusEnum.SENT.getCode())
                .lt(AppMessageRecord::getId, messageId)
                .orderByDesc(AppMessageRecord::getId)
                .last("LIMIT " + Math.max(1, Math.min(size, 20))));
    }

    @Override
    public List<AppMessageRecord> selectSentAfter(Long conversationId, Long messageId, int size) {
        return mapper.selectList(new LambdaQueryWrapper<AppMessageRecord>()
                .eq(AppMessageRecord::getConversationId, conversationId)
                .eq(AppMessageRecord::getSendStatus, MessageSendStatusEnum.SENT.getCode())
                .gt(AppMessageRecord::getId, messageId)
                .orderByAsc(AppMessageRecord::getId)
                .last("LIMIT " + Math.max(1, Math.min(size, 20))));
    }

    @Override
    public void insert(AppMessageRecord entity) {
        mapper.insert(entity);
    }

    @Override
    public int updateById(AppMessageRecord entity) {
        return mapper.updateById(entity);
    }

    @Override
    public int confirmTimMapping(Long id, int expectedVersion, String timMessageId, String timMsgKey,
                                 java.time.LocalDateTime providerSentAt) {
        return mapper.confirmTimMapping(id, expectedVersion, timMessageId, timMsgKey, providerSentAt);
    }

    @Override
    public int markFailed(Long id, int expectedVersion, String failureCode, String failureReason,
                          java.time.LocalDateTime failedAt) {
        return mapper.markFailed(id, expectedVersion, failureCode, failureReason, failedAt);
    }

    @Override
    public int bindConversation(Long id, Long conversationId, String conversationNo,
                                java.time.LocalDateTime updatedAt) {
        return mapper.bindConversation(id, conversationId, conversationNo, updatedAt);
    }

    @Override
    public int clearExpiredContent(java.time.LocalDateTime now, int limit) {
        return mapper.clearExpiredContent(now, Math.max(1, Math.min(limit, 1000)));
    }

    @Override
    public int schedulePurgeByUser(Long userId, java.time.LocalDateTime invalidTime) {
        return mapper.schedulePurgeByUser(userId, invalidTime);
    }

    @Override
    public int schedulePurgeByPair(Long userLowId, Long userHighId,
                                   java.time.LocalDateTime invalidTime) {
        return mapper.schedulePurgeByPair(userLowId, userHighId, invalidTime);
    }

    @Override
    public int schedulePurgeByMessageId(Long messageId, java.time.LocalDateTime terminalTime) {
        return mapper.schedulePurgeByMessageId(messageId, terminalTime);
    }

    @Override
    public int schedulePurgeForTerminalWhispers(java.time.LocalDateTime terminalTime) {
        return mapper.schedulePurgeForTerminalWhispers(terminalTime);
    }

    @Override
    public int markReadThrough(Long conversationId, Long receiverUserId, Long lastMessageId,
                               java.time.LocalDateTime readAt) {
        return mapper.markReadThrough(conversationId, receiverUserId, lastMessageId, readAt);
    }

    @Override
    public int markWhisperRequestsRead(Long receiverUserId, Collection<String> whisperNos,
                                       java.time.LocalDateTime readAt) {
        if (whisperNos == null || whisperNos.isEmpty()) {
            return 0;
        }
        return mapper.update(null, new LambdaUpdateWrapper<AppMessageRecord>()
                .eq(AppMessageRecord::getReceiverUserId, receiverUserId)
                .eq(AppMessageRecord::getSourceBizType, "whisper")
                .in(AppMessageRecord::getSourceBizNo, whisperNos)
                .eq(AppMessageRecord::getSendStatus, MessageSendStatusEnum.SENT.getCode())
                .eq(AppMessageRecord::getReceiverReadStatus, MessageReadStatusEnum.UNREAD.getCode())
                .set(AppMessageRecord::getReceiverReadStatus, MessageReadStatusEnum.READ.getCode())
                .set(AppMessageRecord::getReceiverReadAt, readAt)
                .set(AppMessageRecord::getUpdateTime, readAt));
    }
}
