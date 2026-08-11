package com.spacetime.common.model.message;

import java.time.LocalDateTime;
import java.util.Map;

/** Inbox 内部临时加密载荷，不允许包含聊天正文。 */
public record SystemMessageEventPayload(
        String templateCode,
        String bizType,
        Map<String, Object> variables,
        LocalDateTime visibleUntil) {
}
