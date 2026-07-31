package com.spacetime.miniapp.dto.response;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 邀请规则 H5 当前版本与安全快照。
 */
@Data
public class InviteRulesH5VO {
    private String contentCode;
    private String contentType;
    private String title;
    private String version;
    private LocalDateTime updatedAt;
    private Boolean enabled;
    private String url;
    private String htmlSnapshot;
    private BusinessRule businessRule;

    /**
     * 当前已发布的普通邀请规则，只包含 H5 展示所需的公开字段。
     */
    @Data
    public static class BusinessRule {
        private Integer version;
        private String rewardMode;
        private LocalDateTime publishedAt;
        private List<EventRule> events;
        private List<TierRule> tiers;
    }

    @Data
    public static class EventRule {
        private String eventType;
        private String eventLabel;
        private BigDecimal amount;
    }

    @Data
    public static class TierRule {
        private Integer threshold;
        private BigDecimal amount;
    }
}
