package com.spacetime.common.service;

import java.math.BigDecimal;

/**
 * 规则事件快照视图。
 */
public record PromotionRuleEventSnapshot(
        String eventType,
        String eventLabel,
        boolean enabled,
        BigDecimal amount) {
}
