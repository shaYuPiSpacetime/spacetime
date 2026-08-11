package com.spacetime.common.dao;

import com.spacetime.common.entity.AppMessageEventInbox;

import java.time.LocalDateTime;
import java.util.List;

/** 消息事件 Inbox 数据访问接口。 */
public interface AppMessageEventInboxDao {
    AppMessageEventInbox selectById(Long id);
    AppMessageEventInbox selectByEventKey(String eventKey);
    List<AppMessageEventInbox> selectClaimable(LocalDateTime now, LocalDateTime staleBefore, int limit);
    void insert(AppMessageEventInbox entity);
    int claim(Long id, LocalDateTime now, LocalDateTime staleBefore);
    int markSuccessAndClearPayload(Long id, LocalDateTime processedAt);
    int markFailure(Long id, int retryCount, boolean dead, LocalDateTime nextRetryTime,
                    String errorCode, String errorSummary, LocalDateTime now);
    int clearExpiredPayloads(LocalDateTime now, int limit);
}
