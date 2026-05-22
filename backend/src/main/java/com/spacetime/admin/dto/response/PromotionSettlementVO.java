package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 代理结算单响应
 */
@Data
public class PromotionSettlementVO {
    private Long id;
    private String settlementNo;
    private Long agentId;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private String statsDesc;
    private BigDecimal payableAmount;
    private BigDecimal paidAmount;
    private String status;
    private LocalDateTime confirmTime;
    private LocalDateTime paidTime;
    private String remark;
    private LocalDateTime createTime;
}
