package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 官方助手消息。 */
@Data
public class AssistantMessageItemVO {
    private String assistantMessageNo;
    private String topicCode;
    private String title;
    private String content;
    private String cardType;
    private String actionType;
    private String actionText;
    private String actionValue;
    private String readStatus;
    private LocalDateTime createdTime;
}
