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
    private String inviterUuid;
    private String inviterName;
    private String inviterPhone;
    private Long inviteeId;
    private String inviteeUuid;
    private String inviteeName;
    private String inviteePhone;
    private String eventType;
    private BigDecimal rewardCoin;
    private String status;
    private String riskReason;
    private LocalDateTime frozenTime;
    private LocalDateTime arriveTime;
    private LocalDateTime reviewTime;
    private String reviewRemark;
    private LocalDateTime createTime;
}
