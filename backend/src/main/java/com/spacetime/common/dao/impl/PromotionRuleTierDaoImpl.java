package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionRuleTierDao;
import com.spacetime.common.entity.PromotionRuleTier;
import com.spacetime.common.mapper.PromotionRuleTierMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 推广阶梯规则数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class PromotionRuleTierDaoImpl implements PromotionRuleTierDao {
    private final PromotionRuleTierMapper mapper;

    @Override
    public Page<PromotionRuleTier> selectPage(Page<PromotionRuleTier> page, LambdaQueryWrapper<PromotionRuleTier> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(PromotionRuleTier entity) {
        mapper.insert(entity);
    }

    @Override
    public void deleteByRuleId(Long ruleId) {
        mapper.delete(new LambdaQueryWrapper<PromotionRuleTier>().eq(PromotionRuleTier::getRuleId, ruleId));
    }
}
