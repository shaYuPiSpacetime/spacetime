package com.spacetime.common.service;

import com.spacetime.common.entity.PromotionEventInbox;

import java.util.List;

/**
 * 推广主业务事实事件收件箱服务。
 */
public interface PromotionEventInboxService {
    PromotionEventInbox enqueueRegister(Long userId, List<String> traceNos);
    PromotionEventInbox enqueueBusinessEvent(String eventKey,
                                             String eventType,
                                             Long userId,
                                             String bizNo);
    void process(Long inboxId);
    void processPendingBatch();
}
