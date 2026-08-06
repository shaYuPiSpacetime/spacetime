package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

/** 理想型单选或全部解锁报价。 */
@Data
public class IdealUnlockQuoteVO {
    private String quoteToken;
    private LocalDateTime quoteExpiresAt;
    private String snapshotNo;
    private Integer candidateCount;
    private Integer unitPrice;
    private Integer originalCost;
    private Integer discountPercent;
    private Integer discountAmount;
    private Integer payableCost;
    private Integer currentBalance;
    private Boolean balanceEnough;
    private Integer retentionDays;
    private Integer batchMax;
    private Boolean unlockAll;
}
