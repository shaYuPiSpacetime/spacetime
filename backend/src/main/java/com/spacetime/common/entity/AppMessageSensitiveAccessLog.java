package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 案件上下文敏感正文访问追加审计。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_message_sensitive_access_log")
public class AppMessageSensitiveAccessLog extends BaseEntity {
    private String accessNo;
    private Long operatorId;
    private String operatorRoleCodes;
    private String contextType;
    private String contextNo;
    private String targetType;
    private String targetBizNo;
    private String viewReason;
    private String result;
    private String denyReasonCode;
    private String requestId;
    private String clientIp;
    private String userAgentHash;
    private LocalDateTime accessedAt;
    private LocalDateTime retainUntil;
}
