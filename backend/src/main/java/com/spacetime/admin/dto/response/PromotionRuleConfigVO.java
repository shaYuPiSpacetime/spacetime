package com.spacetime.admin.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 单一来源当前推广规则响应。
 */
@Data
public class PromotionRuleConfigVO {
    private String sourceType;
    private String rewardMode;
    private Integer version;
    private List<EventItem> events;
    private List<TierItem> tiers;
    private LocalDateTime publishedAt;

    @Data
    public static class EventItem {
        private String eventType;
        private String eventLabel;
        private Boolean enabled;
        private BigDecimal amount;
    }

    @Data
    public static class TierItem {
        private Integer threshold;
        private BigDecimal amount;
        private Boolean enabled;
    }
}
