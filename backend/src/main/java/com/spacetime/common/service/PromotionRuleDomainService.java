package com.spacetime.common.service;

import com.spacetime.common.model.promotion.PromotionRuleDraft;

/**
 * 推广不可变规则领域服务。
 */
public interface PromotionRuleDomainService {
    PromotionRuleSnapshot current(String sourceType);
    PromotionRuleSnapshot byId(Long ruleId);
    PromotionRuleSnapshot publish(PromotionRuleDraft draft);
}
