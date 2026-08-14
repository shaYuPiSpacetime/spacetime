package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 上游事件与腾讯回调可靠收件箱；载荷是有界临时 JSON，不得保存聊天正文。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_message_event_inbox")
public class AppMessageEventInbox extends BaseEntity {
    private String eventKey;
    private String sourceModule;
    private String eventType;
    private String producerEventId;
    private String bizNo;
    private Long receiverUserId;
    private String payloadJson;
    private LocalDateTime payloadExpiresAt;
    private LocalDateTime payloadClearedAt;
    private String status;
    private Integer retryCount;
    private LocalDateTime nextRetryTime;
    private LocalDateTime processingStartedAt;
    private String lastErrorCode;
    private String lastErrorSummary;
    private LocalDateTime processedAt;
}
