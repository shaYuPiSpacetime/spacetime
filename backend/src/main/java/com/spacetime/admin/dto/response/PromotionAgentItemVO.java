package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 校园推广员列表与详情响应。
 */
@Data
public class PromotionAgentItemVO {
    private String agentNo;
    private String agentName;
    private String school;
    private String campus;
    private String contactName;
    private String contactPhoneMasked;
    /** 仅具有 promotion:agent:sensitive 权限时返回。 */
    private String contactPhone;
    private String status;
    private String remark;
    private Integer scanClickCount;
    private Integer registerCount;
    private BigDecimal payableBonus;
    private BigDecimal paidBonus;
    private BigDecimal pendingBonus;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PromotionAgentBonusRecordVO> bonusRecords;
    private List<PromotionSettlementItemVO> settlementRecords;
}
