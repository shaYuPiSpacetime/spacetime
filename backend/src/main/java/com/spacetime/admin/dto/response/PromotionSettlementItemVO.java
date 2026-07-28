package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 校园推广员月度结算响应。
 */
@Data
public class PromotionSettlementItemVO {
    private String settlementNo;
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private String agentNo;
    private String agentName;
    private String school;
    private String campus;
    private BigDecimal amount;
    private String status;
    private LocalDateTime generatedAt;
    private LocalDateTime confirmedAt;
    private String confirmedByName;
}
