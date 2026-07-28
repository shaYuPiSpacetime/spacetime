package com.spacetime.common.model.promotion;

import java.math.BigDecimal;

/**
 * 待发布的阶梯配置。
 */
public record PromotionRuleTierDraft(int threshold, BigDecimal amount, boolean enabled) {
}
