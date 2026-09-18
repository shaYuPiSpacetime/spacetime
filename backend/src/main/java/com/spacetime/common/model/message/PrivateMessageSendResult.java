package com.spacetime.common.model.message;

import java.time.LocalDateTime;

/** 普通私信经平台可靠投递后的结果。 */
public record PrivateMessageSendResult(
        String conversationNo,
        String messageNo,
        String clientMsgId,
        String content,
        String sendStatus,
        String timMessageId,
        String timMsgKey,
        LocalDateTime sentAt) {
}
