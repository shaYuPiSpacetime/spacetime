package com.spacetime.common.util;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/** 推荐额度按北京时间零点重置，周期左闭右开。 */
class RecommendBrowseCycleTest {
    @Test
    void beforeMidnightStillUsesCurrentDaysCycle() {
        RecommendBrowseCycle cycle = RecommendBrowseCycle.at(LocalDateTime.of(2026, 10, 10, 23, 59, 59));
        assertThat(cycle.start()).isEqualTo(LocalDateTime.of(2026, 10, 10, 0, 0));
        assertThat(cycle.nextResetAt()).isEqualTo(LocalDateTime.of(2026, 10, 11, 0, 0));
    }

    @Test
    void noonDoesNotResetBrowseQuota() {
        RecommendBrowseCycle cycle = RecommendBrowseCycle.at(LocalDateTime.of(2026, 10, 10, 12, 0));
        assertThat(cycle.start()).isEqualTo(LocalDateTime.of(2026, 10, 10, 0, 0));
        assertThat(cycle.nextResetAt()).isEqualTo(LocalDateTime.of(2026, 10, 11, 0, 0));
    }

    @Test
    void midnightStartsNewCycleWithoutIncludingPreviousViews() {
        RecommendBrowseCycle cycle = RecommendBrowseCycle.at(LocalDateTime.of(2026, 10, 11, 0, 0));
        assertThat(cycle.start()).isEqualTo(LocalDateTime.of(2026, 10, 11, 0, 0));
        assertThat(cycle.nextResetAt()).isEqualTo(LocalDateTime.of(2026, 10, 12, 0, 0));
    }
}
