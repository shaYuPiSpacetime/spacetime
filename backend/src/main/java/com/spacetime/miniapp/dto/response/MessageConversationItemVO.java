package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 私信会话列表项。 */
@Data
public class MessageConversationItemVO {
    private String conversationNo;
    private MessagePeerUserVO peerUser;
    private Long unreadCount;
    private MessageLastMessageVO lastMessage;
}
