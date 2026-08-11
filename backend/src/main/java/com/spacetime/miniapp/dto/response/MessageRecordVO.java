package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 私信历史消息。 */
@Data
public class MessageRecordVO {
    private String messageNo;
    private String messageType;
    private Long senderUserId;
    private Long receiverUserId;
    private String content;
    private Boolean mine;
    private LocalDateTime sentTime;
}
