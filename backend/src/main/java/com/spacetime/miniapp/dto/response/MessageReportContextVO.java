package com.spacetime.miniapp.dto.response;

import lombok.Data;

/** 私信会话举报时由后端提供的可信业务定位信息。 */
@Data
public class MessageReportContextVO {
    private String sourceType;
    private String conversationNo;
    private String timConversationId;
}
