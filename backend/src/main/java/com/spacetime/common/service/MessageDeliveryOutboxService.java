package com.spacetime.common.service;

import java.time.LocalDateTime;

/** 消息渠道 Outbox 可靠投递服务。 */
public interface MessageDeliveryOutboxService {
    void process(Long outboxId, LocalDateTime now);
}
