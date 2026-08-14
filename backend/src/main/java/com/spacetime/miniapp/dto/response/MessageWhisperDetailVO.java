package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
/** 悄悄话详情，包括历史终态关联的私信会话。 */
@Data
public class MessageWhisperDetailVO {
    private String whisperNo;
    private String direction;
    private String status;
    private String displayStatus;
    private MessagePeerUserVO peerUser;
    private String content;
    private Boolean contentAvailable;
    private String requestMessageNo;
    private LocalDateTime createdTime;
    private LocalDateTime expireTime;
    private LocalDateTime processedTime;
    private Long remainingSeconds;
    private String conversationNo;
    private MessageWhisperActionsVO actions;
}
