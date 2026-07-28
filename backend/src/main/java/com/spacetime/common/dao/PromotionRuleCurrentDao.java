package com.spacetime.common.dao;

import com.spacetime.common.entity.PromotionRuleCurrent;

/**
 * 推广当前规则指针数据访问接口。
 */
public interface PromotionRuleCurrentDao {
    PromotionRuleCurrent selectBySourceType(String sourceType);
    PromotionRuleCurrent selectBySourceTypeForUpdate(String sourceType);
    void insert(PromotionRuleCurrent entity);
    int updateById(PromotionRuleCurrent entity);
}
