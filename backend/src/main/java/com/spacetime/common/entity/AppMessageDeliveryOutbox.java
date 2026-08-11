package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 腾讯云 TIM 与微信订阅消息可靠投递箱，payloadJson 禁止保存聊天正文。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_message_delivery_outbox")
public class AppMessageDeliveryOutbox extends BaseEntity {
    private String outboxNo;
    private String eventKey;
    private String aggregateType;
    private Long aggregateId;
    private String aggregateNo;
    private Long senderUserId;
    private Long receiverUserId;
    private String channel;
    private String eventType;
    private String payloadJson;
    private Integer protocolVersion;
    private String status;
    private Integer retryCount;
    private LocalDateTime nextRetryTime;
    private LocalDateTime processingStartedAt;
    private String providerMsgKey;
    private String lastErrorCode;
    private String lastErrorSummary;
    private LocalDateTime sentAt;
    private LocalDateTime callbackConfirmedAt;
}
