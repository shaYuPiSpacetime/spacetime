package com.spacetime.common.util;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/** 推荐额度按北京时间中午重置，跨自然日仍属于同一浏览周期。 */
class RecommendBrowseCycleTest {
    @Test
    void beforeNoonUsesPreviousDaysCycle() {
        RecommendBrowseCycle cycle = RecommendBrowseCycle.at(LocalDateTime.of(2026, 10, 10, 11, 59, 59));
        assertThat(cycle.start()).isEqualTo(LocalDateTime.of(2026, 10, 9, 12, 0));
        assertThat(cycle.nextResetAt()).isEqualTo(LocalDateTime.of(2026, 10, 10, 12, 0));
    }

    @Test
    void noonStartsNewCycleWithoutIncludingPreviousViews() {
        RecommendBrowseCycle cycle = RecommendBrowseCycle.at(LocalDateTime.of(2026, 10, 10, 12, 0));
        assertThat(cycle.start()).isEqualTo(LocalDateTime.of(2026, 10, 10, 12, 0));
        assertThat(cycle.nextResetAt()).isEqualTo(LocalDateTime.of(2026, 10, 11, 12, 0));
    }

    @Test
    void midnightDoesNotResetBrowseQuota() {
        RecommendBrowseCycle cycle = RecommendBrowseCycle.at(LocalDateTime.of(2026, 10, 11, 0, 0));
        assertThat(cycle.start()).isEqualTo(LocalDateTime.of(2026, 10, 10, 12, 0));
        assertThat(cycle.nextResetAt()).isEqualTo(LocalDateTime.of(2026, 10, 11, 12, 0));
    }
}
