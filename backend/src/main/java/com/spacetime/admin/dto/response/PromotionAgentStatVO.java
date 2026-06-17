package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 代理统计响应。
 */
@Data
public class PromotionAgentStatVO {
    private Integer clickCnt;
    private Integer registerCnt;
    private Integer profileCnt;
    private Integer verifyCnt;
    private Integer successCnt;
    private Integer firstVipCnt;
    private Integer firstCoinRechargeCnt;
    private BigDecimal bonusDueAmount;
    private BigDecimal bonusPendingAmount;
    private BigDecimal bonusConfirmedAmount;
    private BigDecimal bonusPaidAmount;
    private LocalDateTime lastEventTime;
    private LocalDateTime lastSettlementTime;
    private Integer statVersion;
}
