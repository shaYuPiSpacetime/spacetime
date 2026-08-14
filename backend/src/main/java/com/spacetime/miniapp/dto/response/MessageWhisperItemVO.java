package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 悄悄话列表项。 */
@Data
public class MessageWhisperItemVO {
    private String whisperNo;
    private String direction;
    private String status;
    private String displayStatus;
    private MessagePeerUserVO peerUser;
    private String payType;
    private LocalDateTime createdTime;
    private LocalDateTime expireTime;
    private Boolean canReply;
    private Boolean unread;
}
