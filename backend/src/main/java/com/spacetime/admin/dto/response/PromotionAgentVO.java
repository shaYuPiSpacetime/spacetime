package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 代理响应
 */
@Data
public class PromotionAgentVO {
    private Long id;
    private String agentNo;
    private String agentName;
    private String contactName;
    private String contactPhone;
    private String school;
    private String campus;
    private String bonusRuleGroup;
    private BigDecimal bonusDueAmount;
    private BigDecimal bonusPaidAmount;
    private BigDecimal bonusPendingAmount;
    private String status;
    private String remark;
    private PromotionAgentStatVO stat;
    private List<PromotionAgentQrCodeVO> qrCodes;
    private List<AgentEventRecordVO> promotionEvents;
    private List<AgentBonusRecordVO> bonusRecords;
    private List<PromotionSettlementVO> settlementRecords;
    private LocalDateTime createTime;

    @Data
    public static class AgentEventRecordVO {
        private Long id;
        private String qrCode;
        private Long relationId;
        private Long userId;
        private String userUuid;
        private String userName;
        private String userPhone;
        private String eventType;
        private LocalDateTime eventTime;
        private Integer bonusGenerated;
    }

    @Data
    public static class AgentBonusRecordVO {
        private Long id;
        private String bonusNo;
        private Long relationId;
        private Long userId;
        private String userUuid;
        private String userName;
        private String eventType;
        private BigDecimal bonusAmount;
        private String status;
        private Long settlementId;
        private LocalDateTime createTime;
    }
}
