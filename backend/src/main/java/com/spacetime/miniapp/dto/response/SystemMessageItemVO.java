package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 用户系统站内消息。 */
@Data
public class SystemMessageItemVO {
    private String noticeNo;
    private String notificationType;
    private String bizType;
    private String title;
    private String content;
    private String readStatus;
    private String jumpType;
    private String jumpValue;
    private LocalDateTime createdTime;
}
