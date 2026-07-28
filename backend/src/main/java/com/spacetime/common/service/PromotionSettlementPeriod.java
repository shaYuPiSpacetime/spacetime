package com.spacetime.common.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;

/**
 * 北京时间自然月结算区间。
 */
public record PromotionSettlementPeriod(
        LocalDate month,
        LocalDateTime startInclusive,
        LocalDateTime endExclusive) {

    public static PromotionSettlementPeriod of(YearMonth month) {
        LocalDate firstDay = month.atDay(1);
        return new PromotionSettlementPeriod(
                firstDay,
                firstDay.atStartOfDay(),
                month.plusMonths(1).atDay(1).atStartOfDay());
    }
}
