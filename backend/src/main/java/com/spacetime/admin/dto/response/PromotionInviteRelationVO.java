package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 邀请关系响应
 */
@Data
public class PromotionInviteRelationVO {
    private Long id;
    private String relationNo;
    private String sourceType;
    private Long inviterId;
    private String inviterUuid;
    private String inviterName;
    private String inviterPhone;
    private Long inviteeId;
    private String inviteeUuid;
    private String inviteeName;
    private String inviteePhone;
    private Long agentId;
    private String agentNo;
    private String agentName;
    private String qrCode;
    private String status;
    private String frozenBeforeStatus;
    private String invalidReason;
    private LocalDateTime bindTime;
    private LocalDateTime firstClickTime;
    private LocalDateTime registerTime;
    private LocalDateTime firstLoginTime;
    private LocalDateTime profileCompleteTime;
    private LocalDateTime verifySuccessTime;
    private LocalDateTime firstVipTime;
    private LocalDateTime firstCoinRechargeTime;
    private LocalDateTime successMetricHitTime;
    private BigDecimal totalRewardCoin;
    private List<RewardRecordVO> rewardRecords;
    private List<RiskRecordVO> riskRecords;
    private List<AuditRecordVO> auditRecords;

    @Data
    public static class RewardRecordVO {
        private Long id;
        private String rewardNo;
        private String eventType;
        private BigDecimal rewardCoin;
        private String status;
        private LocalDateTime createTime;
        private LocalDateTime arriveTime;
        private String riskReason;
    }

    @Data
    public static class RiskRecordVO {
        private Long id;
        private String riskReason;
        private String status;
        private LocalDateTime createTime;
        private String reviewRemark;
    }

    @Data
    public static class AuditRecordVO {
        private Long id;
        private String action;
        private String beforeValue;
        private String afterValue;
        private String remark;
        private LocalDateTime createTime;
    }
}
