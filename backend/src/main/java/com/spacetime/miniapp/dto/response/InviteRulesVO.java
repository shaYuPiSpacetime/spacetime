package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 普通邀请当前业务规则响应。
 */
@Data
public class InviteRulesVO {
    private String successDefinition;
    private String relationValidity;
    private List<EventRule> eventRules;
    private List<TierRule> tiers;
    private LocalDateTime updatedAt;

    @Data
    public static class EventRule {
        private String eventType;
        private String eventLabel;
        private Boolean enabled;
        private BigDecimal amount;
    }

    @Data
    public static class TierRule {
        private Integer threshold;
        private BigDecimal amount;
    }
}
