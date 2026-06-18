package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 推广规则响应
 */
@Data
public class PromotionRuleVO {
    private Long id;
    private String ruleName;
    private String ruleType;
    private String eventType;
    private BigDecimal rewardAmount;
    private String rewardUnit;
    private BigDecimal dailyLimit;
    private LocalDateTime effectiveTime;
    private LocalDateTime expireTime;
    private String status;
    private String remark;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
    private Long createdBy;
    private String createdByName;
    private Long updatedBy;
    private String updatedByName;
}
