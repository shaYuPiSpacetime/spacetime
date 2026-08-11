package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.spacetime.common.enums.MessageSendStatusEnum;
import com.spacetime.common.enums.MessageReadStatusEnum;
import com.spacetime.common.enums.MessageTypeEnum;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 私信会话内不可物理删除的消息事实。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_message_record")
public class AppMessageRecord extends BaseEntity {
    private String messageNo;
    private String clientMsgId;
    private Long conversationId;
    private String conversationNo;
    private String senderType;
    private Long senderUserId;
    private Long receiverUserId;
    /** @see MessageTypeEnum */
    private String messageType;
    /** 日常聊天明文归档；普通业务接口和后台元数据接口禁止返回。 */
    private String contentText;
    /** @see MessageSendStatusEnum */
    private String sendStatus;
    /** @see MessageReadStatusEnum */
    private String receiverReadStatus;
    private LocalDateTime receiverReadAt;
    private String timMessageId;
    private String timMsgKey;
    private LocalDateTime providerSentAt;
    private LocalDateTime sentAt;
    private Long replyToMessageId;
    private String sourceBizType;
    private String sourceBizNo;
    private String failureCode;
    private String failureReason;
    private LocalDateTime isolatedAt;
    private LocalDateTime purgeAfter;
    private LocalDateTime contentClearedAt;
    private Integer version;
}
