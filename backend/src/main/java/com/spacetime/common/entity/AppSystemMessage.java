package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 用户系统站内消息；平台通知标题和正文使用明文存储。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_system_message")
public class AppSystemMessage extends BaseEntity {
    private String noticeNo;
    private Long receiverUserId;
    private String producerEventId;
    private String notificationType;
    private String bizType;
    private String bizNo;
    private String templateCode;
    private String templateVersion;
    private String titleText;
    private String contentText;
    private String contentFormat;
    private String jumpType;
    private String actionText;
    private String jumpValue;
    private Integer safetyRequired;
    private LocalDateTime readAt;
    private LocalDateTime visibleUntil;
    private LocalDateTime anonymizedAt;
}
