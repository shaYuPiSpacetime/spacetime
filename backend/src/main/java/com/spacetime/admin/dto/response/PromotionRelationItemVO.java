package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 永久邀请关系列表与详情响应。
 */
@Data
public class PromotionRelationItemVO {
    private String relationNo;
    private String sourceType;
    private String sourceObjectNo;
    private String sourceObjectName;
    private String sourceObjectMobileMasked;
    private String inviteeUserNo;
    private String inviteeNickname;
    private String inviteeMobileMasked;
    private LocalDateTime registeredAt;
    private BigDecimal paidRewardTotal;
    private List<PromotionRewardItemVO> rewardItems;
}
