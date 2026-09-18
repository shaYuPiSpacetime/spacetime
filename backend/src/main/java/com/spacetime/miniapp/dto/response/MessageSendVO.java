package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 普通私信发送结果。 */
@Data
public class MessageSendVO {
    private String conversationNo;
    private String messageNo;
    private String clientMsgId;
    private String content;
    private String sendStatus;
    private String timMessageId;
    private String timMsgKey;
    private LocalDateTime sentAt;
}
