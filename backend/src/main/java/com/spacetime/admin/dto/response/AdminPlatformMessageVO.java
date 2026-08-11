package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 系统与官方助手消息合并元数据，不包含标题和正文。 */
@Data
public class AdminPlatformMessageVO {
    private String recordNo;
    private String channel;
    private String category;
    private String bizType;
    private String bizNo;
    private String readStatus;
    private String actionType;
    private LocalDateTime visibleUntil;
    private LocalDateTime businessTime;
}
