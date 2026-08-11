package com.spacetime.common.dao;

import com.spacetime.common.entity.AppMessageDeliveryOutbox;

import java.time.LocalDateTime;
import java.util.List;

/** 消息渠道 Outbox 数据访问接口。 */
public interface AppMessageDeliveryOutboxDao {
    AppMessageDeliveryOutbox selectById(Long id);
    AppMessageDeliveryOutbox selectByEventAndChannel(String eventKey, String channel);
    AppMessageDeliveryOutbox selectByAggregate(String aggregateType, Long aggregateId, String channel);
    List<AppMessageDeliveryOutbox> selectClaimable(LocalDateTime now, LocalDateTime staleBefore, int limit);
    List<AppMessageDeliveryOutbox> selectMappingInconsistencies(LocalDateTime staleBefore, int limit);
    void insert(AppMessageDeliveryOutbox entity);
    int claim(Long id, LocalDateTime now, LocalDateTime staleBefore);
    int markSent(Long id, String providerMsgKey, LocalDateTime sentAt);
    int confirmCallback(Long id, String providerMsgKey, LocalDateTime confirmedAt);
    int markFailure(Long id, int retryCount, boolean dead, LocalDateTime nextRetryTime,
                    String errorCode, String errorSummary, LocalDateTime now);
}
