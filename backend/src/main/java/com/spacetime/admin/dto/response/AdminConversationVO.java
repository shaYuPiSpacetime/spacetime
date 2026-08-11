package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** App 用户私信会话元数据。 */
@Data
public class AdminConversationVO {
    private String conversationNo;
    private String timConversationId;
    private String matchNo;
    private String peerMask;
    private String status;
    private Boolean protectionEnabled;
    private LocalDateTime protectionUntil;
    private LocalDateTime femaleFirstMessageAt;
    private LocalDateTime lastBusinessActivityTime;
    private String invalidReason;
    private LocalDateTime invalidTime;
    private LocalDateTime createTime;
}
