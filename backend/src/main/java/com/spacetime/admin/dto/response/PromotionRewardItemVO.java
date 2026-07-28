package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 推广奖励统一展示行。
 */
@Data
public class PromotionRewardItemVO {
    private String rewardNo;
    private String relationNo;
    private String sourceType;
    private String rewardObjectNo;
    private String rewardObjectName;
    private String rewardObjectMobileMasked;
    private String inviteeUserNo;
    private String inviteeNickname;
    private String eventType;
    private String eventLabel;
    private Integer ladderThreshold;
    private BigDecimal amount;
    private String amountUnit;
    private String status;
    private Integer ruleVersion;
    private Integer retryCount;
    private String failureReason;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
}
