package com.spacetime.common.model.promotion;

import java.util.List;

/**
 * 待发布的推广规则值对象。
 */
public record PromotionRuleDraft(
        String sourceType,
        String rewardMode,
        int expectedVersion,
        List<PromotionRuleEventDraft> events,
        List<PromotionRuleTierDraft> tiers) {
}
