package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.PromotionRuleCurrentDao;
import com.spacetime.common.entity.PromotionRuleCurrent;
import com.spacetime.common.mapper.PromotionRuleCurrentMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 推广当前规则指针数据访问实现。
 */
@Repository
@RequiredArgsConstructor
public class PromotionRuleCurrentDaoImpl implements PromotionRuleCurrentDao {
    private final PromotionRuleCurrentMapper mapper;

    @Override
    public PromotionRuleCurrent selectBySourceType(String sourceType) {
        return mapper.selectOne(new LambdaQueryWrapper<PromotionRuleCurrent>()
                .eq(PromotionRuleCurrent::getSourceType, sourceType));
    }

    @Override
    public PromotionRuleCurrent selectBySourceTypeForUpdate(String sourceType) {
        return mapper.selectBySourceTypeForUpdate(sourceType);
    }

    @Override
    public void insert(PromotionRuleCurrent entity) {
        mapper.insert(entity);
    }

    @Override
    public int updateById(PromotionRuleCurrent entity) {
        return mapper.updateById(entity);
    }
}
