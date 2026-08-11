package com.spacetime.common.provider;

/** 发往即时通信渠道的消息命令。 */
public record InstantMessageCommand(
        Long messageRecordId,
        String messageNo,
        Long senderUserId,
        Long receiverUserId,
        String eventType,
        String contentText,
        String metadataJson,
        Integer protocolVersion) {
}
