package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.util.List;

/** 平台私信会话状态和 TIM 映射；聊天历史、实时收发及主已读链路由腾讯云 TIM SDK 承接。 */
@Data
public class MessageConversationDetailVO {
    private String conversationNo;
    private String timConversationId;
    private String conversationStatus;
    private String accessMode;
    private MessagePeerUserVO peerUser;
    private Boolean canEnterConversation;
    private Boolean canSend;
    private String sendBlockedReason;
    private Boolean canReportChat;
    private MessageReportContextVO reportContext;
    private MessageFemaleProtectionVO femaleProtection;
    private List<String> safetyActions;
}
