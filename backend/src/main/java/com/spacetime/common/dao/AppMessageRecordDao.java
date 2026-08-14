package com.spacetime.common.dao;

import com.spacetime.common.entity.AppMessageRecord;

import java.util.Collection;
import java.util.List;
import java.time.LocalDateTime;

/** 私信消息事实数据访问接口。 */
public interface AppMessageRecordDao {
    AppMessageRecord selectById(Long id);
    List<AppMessageRecord> selectByIds(Collection<Long> ids);
    AppMessageRecord selectByMessageNo(String messageNo);
    AppMessageRecord selectBySenderClientMsgId(Long senderUserId, String clientMsgId);
    AppMessageRecord selectByTimMsgKey(String timMsgKey);
    AppMessageRecord selectByConversationAndTimLocator(Long conversationId, String timMessageId,
                                                        String timMsgKey);
    long countUnreadAfter(Long conversationId, Long receiverUserId, Long messageId);
    long countUnreadByReceiver(Long receiverUserId);
    long countUnreadByConversation(Long conversationId, Long receiverUserId);
    List<AppMessageRecord> selectHistory(Long conversationId, Long beforeId, int size);
    List<AppMessageRecord> selectSentBefore(Long conversationId, Long messageId, int size);
    List<AppMessageRecord> selectSentAfter(Long conversationId, Long messageId, int size);
    void insert(AppMessageRecord entity);
    int updateById(AppMessageRecord entity);
    int confirmTimMapping(Long id, int expectedVersion, String timMessageId, String timMsgKey,
                          java.time.LocalDateTime providerSentAt);
    int markFailed(Long id, int expectedVersion, String failureCode, String failureReason,
                   java.time.LocalDateTime failedAt);
    int bindConversation(Long id, Long conversationId, String conversationNo,
                         java.time.LocalDateTime updatedAt);
    int clearExpiredContent(java.time.LocalDateTime now, int limit);
    int schedulePurgeByUser(Long userId, java.time.LocalDateTime invalidTime);
    int schedulePurgeByPair(Long userLowId, Long userHighId, java.time.LocalDateTime invalidTime);
    int schedulePurgeByMessageId(Long messageId, java.time.LocalDateTime terminalTime);
    int schedulePurgeForTerminalWhispers(java.time.LocalDateTime terminalTime);
    int markReadThrough(Long conversationId, Long receiverUserId, Long lastMessageId,
                        LocalDateTime readAt);
    int markReadThroughTime(Long conversationId, Long receiverUserId, Long senderUserId,
                            LocalDateTime lastReadTime, LocalDateTime readAt);
    boolean existsReportableIncomingText(Long conversationId, Long receiverUserId);
    int markWhisperRequestsRead(Long receiverUserId, Collection<String> whisperNos,
                                LocalDateTime readAt);
}
