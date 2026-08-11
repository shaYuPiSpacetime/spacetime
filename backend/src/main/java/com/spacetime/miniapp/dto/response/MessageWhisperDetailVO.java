package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** 悄悄话详情，包括历史终态关联的私信会话。 */
@Data
public class MessageWhisperDetailVO {
    private String whisperNo;
    private String direction;
    private String status;
    private String displayStatus;
    private MessagePeerUserVO peerUser;
    private String timConversationId;
    private String requestTimMessageId;
    private String requestTimMsgKey;
    private String replyMessageNo;
    private String replyTimMessageId;
    private String replyTimMsgKey;
    private LocalDateTime createdTime;
    private LocalDateTime expireTime;
    private Long remainingSeconds;
    private Boolean canReply;
    private String conversationNo;
    private List<String> safetyActions;
}
