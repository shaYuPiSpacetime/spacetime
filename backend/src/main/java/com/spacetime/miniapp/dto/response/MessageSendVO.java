package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 普通私信发送结果。 */
@Data
public class MessageSendVO {
    private String conversationNo;
    private String messageNo;
    private String sendStatus;
    private LocalDateTime sentAt;
}
