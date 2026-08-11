package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 私信会话已读确认结果。 */
@Data
public class MessageReadVO {
    private String conversationNo;
    private String lastReadMessageNo;
    private Integer unreadCount;
    private LocalDateTime readAt;
}
