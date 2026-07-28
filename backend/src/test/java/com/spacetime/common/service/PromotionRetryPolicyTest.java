package com.spacetime.common.service;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 奖励自动补偿退避策略测试。
 */
class PromotionRetryPolicyTest {

    @Test
    void 自动补偿依次使用五分钟三十分钟两小时() {
        assertThat(PromotionRetryPolicy.delays())
                .containsExactly(Duration.ofMinutes(5), Duration.ofMinutes(30), Duration.ofHours(2));
        assertThat(List.of(
                PromotionRetryPolicy.nextDelay(0),
                PromotionRetryPolicy.nextDelay(1),
                PromotionRetryPolicy.nextDelay(2)))
                .containsExactly(
                        Duration.ofMinutes(5),
                        Duration.ofMinutes(30),
                        Duration.ofHours(2));
        assertThat(PromotionRetryPolicy.canAutoRetry(2)).isTrue();
        assertThat(PromotionRetryPolicy.canAutoRetry(3)).isFalse();
    }
}
