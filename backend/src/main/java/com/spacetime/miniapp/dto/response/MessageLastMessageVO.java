package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 私信列表行的最新消息投影，不返回完整聊天正文。 */
@Data
public class MessageLastMessageVO {
    private String messageNo;
    private String messageType;
    /** incoming=对方发送，outgoing=当前用户发送。 */
    private String direction;
    private String preview;
    private LocalDateTime messageTime;
    private String sendStatus;
}
