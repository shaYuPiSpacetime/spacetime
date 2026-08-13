package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 用户系统站内消息，正文使用独立敏感字段加密策略。 */
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
    private byte[] titleCiphertext;
    private byte[] titleIv;
    private String titleKeyVersion;
    private String titleHmac;
    private byte[] contentCiphertext;
    private byte[] contentIv;
    private String contentKeyVersion;
    private String contentHmac;
    private String contentFormat;
    private String jumpType;
    private String actionText;
    private String jumpValue;
    private Integer safetyRequired;
    private LocalDateTime readAt;
    private LocalDateTime visibleUntil;
    private LocalDateTime anonymizedAt;
}
