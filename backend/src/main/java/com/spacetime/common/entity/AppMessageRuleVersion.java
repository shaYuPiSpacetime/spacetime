package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/** 不可变消息业务规则版本。 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_message_rule_version")
public class AppMessageRuleVersion extends BaseEntity {
    private String versionNo;
    private String scopeCode;
    private String status;
    private Integer activeMarker;
    private Integer femaleProtectionEnabled;
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
}
