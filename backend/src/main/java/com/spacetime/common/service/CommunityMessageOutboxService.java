package com.spacetime.common.service;

import java.time.LocalDateTime;

/** 将社区结果事件可靠转换为消息中心系统消息。 */
public interface CommunityMessageOutboxService {
    void process(Long outboxId, LocalDateTime now);
}
