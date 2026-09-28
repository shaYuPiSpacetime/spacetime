package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 小程序私信历史消息投影。 */
@Data
public class MessageHistoryItemVO {
    private String messageNo;
    private String clientMsgId;
    private String conversationNo;
    private String messageType;
    /** incoming=对方发送，outgoing=当前用户发送，system=系统消息。 */
    private String direction;
    private String content;
    private LocalDateTime sentAt;
    private String sendStatus;
    private String timMessageId;
    private String timMsgKey;
}
