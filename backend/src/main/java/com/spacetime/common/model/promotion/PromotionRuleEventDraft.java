package com.spacetime.common.model.promotion;

import java.math.BigDecimal;

/**
 * 待发布的推广事件配置。
 */
public record PromotionRuleEventDraft(String eventType, boolean enabled, BigDecimal amount) {
}
