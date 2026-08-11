package com.spacetime.common.model.message;

import java.time.LocalDateTime;

/** 普通私信发送结果。 */
public record MessageSendResult(
        String conversationNo,
        String messageNo,
        String sendStatus,
        LocalDateTime sentAt) {
}
