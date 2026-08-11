package com.spacetime.common.service;

import java.time.LocalDateTime;

/** 消息事件 Inbox 认领、消费和临时载荷清理服务。 */
public interface MessageEventInboxService {
    void process(Long inboxId, LocalDateTime now);
    int clearExpiredPayloads(LocalDateTime now, int limit);
}
