package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 消息首页官方助手或系统消息摘要。 */
@Data
public class MessageChannelSummaryVO {
    private Long unreadCount;
    private String latestPreview;
    private LocalDateTime latestTime;
}
