package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 社区领域事件 Outbox；PRD-03 消费治理与内容结果事件。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("community_event_outbox")
public class CommunityEventOutbox extends BaseEntity {
    private String eventNo;
    private String eventType;
    private String aggregateType;
    private String aggregateNo;
    private Integer aggregateVersion;
    private String payload;
    private String status;
    private Integer retryCount;
    private LocalDateTime nextRetryAt;
    private LocalDateTime sentAt;
    private String lastError;
}
