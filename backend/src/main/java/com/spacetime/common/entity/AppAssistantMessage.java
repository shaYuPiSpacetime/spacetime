package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 官方助手低频消息与用户已读状态。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_assistant_message")
public class AppAssistantMessage extends BaseEntity {
    private String assistantMessageNo;
    private Long receiverUserId;
    private String topicCode;
    private String contentVersion;
    private String templateCode;
    private String templateVersion;
    private String titleText;
    private String contentText;
    private byte[] titleCiphertext;
    private byte[] titleIv;
    private String titleKeyVersion;
    private String titleHmac;
    private byte[] contentCiphertext;
    private byte[] contentIv;
    private String contentKeyVersion;
    private String contentHmac;
    private String cardType;
    private String actionType;
    private String actionText;
    private String actionValue;
    private LocalDateTime readAt;
    private LocalDateTime visibleFrom;
    private LocalDateTime visibleUntil;
}
