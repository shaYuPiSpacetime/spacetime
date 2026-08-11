package com.spacetime.admin.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 当前消息规则版本与运行时开关。 */
@Data
public class MessageConfigVO {
    private String versionNo;
    private String scopeCode;
    private String status;
    private Boolean femaleProtectionEnabled;
    private Integer femaleProtectionDays;
    private Integer whisperExpireDays;
    private Integer whisperCooldownDays;
    private Integer ordinaryMessageRetainDays;
    private Integer systemMessageVisibleDays;
    private Integer reportEvidenceRetainDays;
    private Integer severeEvidenceRetainDays;
    private Integer sensitiveAuditRetainDays;
    private String remark;
    private Long publishedBy;
    private LocalDateTime publishedAt;
    private MessageRuntimeControlVO globalSend;
}
