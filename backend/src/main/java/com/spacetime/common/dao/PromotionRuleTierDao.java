package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionRuleTier;

/**
 * 推广阶梯规则数据访问接口
 */
public interface PromotionRuleTierDao {
    java.util.List<PromotionRuleTier> selectByRuleId(Long ruleId);
    Page<PromotionRuleTier> selectPage(Page<PromotionRuleTier> page, com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PromotionRuleTier> wrapper);
    void insert(PromotionRuleTier entity);
}
