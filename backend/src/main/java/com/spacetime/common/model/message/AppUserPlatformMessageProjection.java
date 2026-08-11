package com.spacetime.common.model.message;

import lombok.Data;

import java.time.LocalDateTime;

/** App 用户管理系统与官方助手消息合并查询投影，不包含标题和正文。 */
@Data
public class AppUserPlatformMessageProjection {
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
