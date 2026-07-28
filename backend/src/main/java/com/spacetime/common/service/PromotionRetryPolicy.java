package com.spacetime.common.service;

import java.time.Duration;
import java.util.List;

/**
 * 普通奖励自动重试策略。
 */
public final class PromotionRetryPolicy {
    private static final List<Duration> DELAYS = List.of(
            Duration.ofMinutes(5),
            Duration.ofMinutes(30),
            Duration.ofHours(2));

    private PromotionRetryPolicy() {
    }

    public static List<Duration> delays() {
        return DELAYS;
    }

    public static boolean canAutoRetry(int retryCount) {
        return retryCount >= 0 && retryCount < DELAYS.size();
    }

    public static Duration nextDelay(int retryCount) {
        if (!canAutoRetry(retryCount)) {
            throw new IllegalArgumentException("自动重试次数已耗尽");
        }
        return DELAYS.get(retryCount);
    }
}
