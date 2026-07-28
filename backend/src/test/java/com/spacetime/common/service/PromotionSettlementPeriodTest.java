package com.spacetime.common.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 校园代理自然月结算边界测试。
 */
class PromotionSettlementPeriodTest {

    @Test
    void 自然月使用北京时间半开区间并覆盖闰年() {
        PromotionSettlementPeriod period = PromotionSettlementPeriod.of(YearMonth.of(2028, 2));
        assertThat(period.startInclusive()).isEqualTo(LocalDateTime.of(2028, 2, 1, 0, 0));
        assertThat(period.endExclusive()).isEqualTo(LocalDateTime.of(2028, 3, 1, 0, 0));
        assertThat(period.month()).isEqualTo(LocalDate.of(2028, 2, 1));
    }
}
