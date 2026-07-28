package com.spacetime.common.service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 已发布规则的完整不可变视图。
 */
public record PromotionRuleSnapshot(
        Long ruleId,
        String sourceType,
        String rewardMode,
        int version,
        List<PromotionRuleEventSnapshot> events,
        List<PromotionRuleTierSnapshot> tiers,
        LocalDateTime publishedAt) {
}
