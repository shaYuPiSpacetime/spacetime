package com.spacetime.common.util;

import java.time.LocalDateTime;
import java.time.ZoneId;

/** 推荐浏览周期：北京时间每天零点起，至次日零点，不包含结束时刻。 */
public record RecommendBrowseCycle(LocalDateTime currentTime, LocalDateTime start,
                                   LocalDateTime nextResetAt) {
    private static final ZoneId BEIJING = ZoneId.of("Asia/Shanghai");

    public static RecommendBrowseCycle current() {
        return at(LocalDateTime.now(BEIJING));
    }

    public static RecommendBrowseCycle at(LocalDateTime now) {
        LocalDateTime start = now.toLocalDate().atStartOfDay();
        return new RecommendBrowseCycle(now, start, start.plusDays(1));
    }
}
