package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionRule;

/**
 * 推广规则数据访问接口
 */
public interface PromotionRuleDao {
    PromotionRule selectById(Long id);
    Page<PromotionRule> selectPage(Page<PromotionRule> page, com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PromotionRule> wrapper);
    void insert(PromotionRule entity);
    void updateById(PromotionRule entity);
    void deleteById(Long id);
}
