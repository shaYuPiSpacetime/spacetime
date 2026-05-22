package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 邀请奖励流水响应
 */
@Data
public class PromotionRewardLogVO {
    private Long id;
    private String rewardNo;
    private Long relationId;
    private Long inviterId;
    private Long inviteeId;
    private String eventType;
    private BigDecimal rewardCoin;
    private String status;
    private String riskReason;
    private LocalDateTime arriveTime;
    private LocalDateTime reviewTime;
    private String reviewRemark;
    private LocalDateTime createTime;
}
