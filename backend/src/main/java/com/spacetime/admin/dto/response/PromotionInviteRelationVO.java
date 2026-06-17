package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 邀请关系响应
 */
@Data
public class PromotionInviteRelationVO {
    private Long id;
    private String relationNo;
    private String sourceType;
    private Long inviterId;
    private String inviterName;
    private Long inviteeId;
    private String inviteeName;
    private Long agentId;
    private String agentName;
    private String qrCode;
    private String status;
    private String frozenBeforeStatus;
    private String invalidReason;
    private LocalDateTime bindTime;
    private LocalDateTime firstLoginTime;
    private LocalDateTime profileCompleteTime;
    private LocalDateTime verifySuccessTime;
    private LocalDateTime successMetricHitTime;
    private BigDecimal totalRewardCoin;
}
