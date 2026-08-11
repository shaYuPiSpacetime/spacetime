package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 私信会话列表项。 */
@Data
public class MessageConversationItemVO {
    private String conversationNo;
    private String timConversationId;
    private String conversationStatus;
    private MessagePeerUserVO peerUser;
    private Boolean canEnterConversation;
    private Boolean canSend;
    private String sendBlockedReason;
    private LocalDateTime lastBusinessActivityTime;
}
