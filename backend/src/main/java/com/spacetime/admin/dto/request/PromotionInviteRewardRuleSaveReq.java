package com.spacetime.admin.dto.request;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 普通邀请奖励规则保存请求。
 */
@Data
public class PromotionInviteRewardRuleSaveReq {
    private List<EventRule> events;
    private String successMetric;
    private String rewardMode;
    private BigDecimal rewardCap;
    private LocalDateTime effectiveTime;
    private LocalDateTime expireTime;
    private List<LadderRule> ladder;

    @Data
    public static class EventRule {
        private String eventType;
        private Boolean enabled;
        private BigDecimal amount;
    }

    @Data
    public static class LadderRule {
        private Integer minCount;
        private Integer maxCount;
        private BigDecimal amount;
        private Boolean enabled;
    }
}
