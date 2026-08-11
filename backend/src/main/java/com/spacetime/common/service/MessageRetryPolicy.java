package com.spacetime.common.service;

import java.time.Duration;
import java.util.List;

/** Shared retry schedule for message Inbox and Outbox workers. */
public final class MessageRetryPolicy {
    private static final List<Duration> DELAYS = List.of(
            Duration.ofMinutes(1),
            Duration.ofMinutes(5),
            Duration.ofMinutes(15),
            Duration.ofHours(1),
            Duration.ofHours(6),
            Duration.ofHours(12),
            Duration.ofHours(24));

    private MessageRetryPolicy() {
    }

    public static boolean isDead(int retryCount) {
        return retryCount > DELAYS.size();
    }

    /** Returns the delay for a one-based failure count. */
    public static Duration nextDelay(int retryCount) {
        if (retryCount <= 0 || isDead(retryCount)) {
            throw new IllegalArgumentException("消息自动重试次数不在可用范围内");
        }
        return DELAYS.get(retryCount - 1);
    }
}
