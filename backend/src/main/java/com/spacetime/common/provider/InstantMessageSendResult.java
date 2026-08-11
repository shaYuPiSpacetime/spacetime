package com.spacetime.common.provider;

import java.time.LocalDateTime;

/** 即时通信渠道确认的稳定消息映射。 */
public record InstantMessageSendResult(
        String timMessageId,
        String timMsgKey,
        LocalDateTime sentAt) {
}
