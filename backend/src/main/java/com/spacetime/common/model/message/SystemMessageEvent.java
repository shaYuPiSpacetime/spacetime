package com.spacetime.common.model.message;

import java.time.LocalDateTime;
import java.util.Map;

/** 上游业务提交后发布的系统消息事实。 */
public record SystemMessageEvent(
        String sourceModule,
        String producerEventId,
        Long receiverUserId,
        String bizNo,
        String templateCode,
        String bizType,
        Map<String, Object> variables,
        LocalDateTime visibleUntil) {
}
