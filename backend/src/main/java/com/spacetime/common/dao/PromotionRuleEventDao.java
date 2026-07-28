package com.spacetime.common.dao;

import com.spacetime.common.entity.PromotionRuleEvent;

import java.util.List;

/**
 * 推广规则事件数据访问接口。
 */
public interface PromotionRuleEventDao {
    List<PromotionRuleEvent> selectByRuleId(Long ruleId);
    void insert(PromotionRuleEvent entity);
}
