package com.spacetime.common.util;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

/** 推荐浏览周期：北京时间中午 12 点起，至次日中午 12 点，不包含结束时刻。 */
public record RecommendBrowseCycle(LocalDateTime currentTime, LocalDateTime start,
                                   LocalDateTime nextResetAt) {
    private static final ZoneId BEIJING = ZoneId.of("Asia/Shanghai");

    public static RecommendBrowseCycle current() {
        return at(LocalDateTime.now(BEIJING));
    }

    public static RecommendBrowseCycle at(LocalDateTime now) {
        LocalDateTime start = now.toLocalDate().atTime(LocalTime.NOON);
        if (now.isBefore(start)) {
            start = start.minusDays(1);
        }
        return new RecommendBrowseCycle(now, start, start.plusDays(1));
    }
}
