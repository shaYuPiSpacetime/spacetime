package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionRuleDao;
import com.spacetime.common.entity.PromotionRule;
import com.spacetime.common.mapper.PromotionRuleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 推广规则数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class PromotionRuleDaoImpl implements PromotionRuleDao {
    private final PromotionRuleMapper mapper;

    @Override
    public PromotionRule selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<PromotionRule> selectPage(Page<PromotionRule> page, LambdaQueryWrapper<PromotionRule> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(PromotionRule entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(PromotionRule entity) {
        mapper.updateById(entity);
    }

    @Override
    public void deleteById(Long id) {
        mapper.deleteById(id);
    }
}
