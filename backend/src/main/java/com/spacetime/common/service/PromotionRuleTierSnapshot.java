package com.spacetime.common.service;

import java.math.BigDecimal;

/**
 * 规则阶梯快照视图。
 */
public record PromotionRuleTierSnapshot(int threshold, BigDecimal amount, boolean enabled) {
}
