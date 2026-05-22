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
    private Long inviteeId;
    private Long agentId;
    private String agentCode;
    private String status;
    private LocalDateTime bindTime;
    private LocalDateTime firstLoginTime;
    private LocalDateTime profileCompleteTime;
    private LocalDateTime verifySuccessTime;
    private String invalidReason;
    private String frozenReason;
    private BigDecimal totalRewardCoin;
}
