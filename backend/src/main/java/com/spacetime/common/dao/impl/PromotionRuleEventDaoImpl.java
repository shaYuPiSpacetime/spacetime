package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.PromotionRuleEventDao;
import com.spacetime.common.entity.PromotionRuleEvent;
import com.spacetime.common.mapper.PromotionRuleEventMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 推广规则事件数据访问实现。
 */
@Repository
@RequiredArgsConstructor
public class PromotionRuleEventDaoImpl implements PromotionRuleEventDao {
    private final PromotionRuleEventMapper mapper;

    @Override
    public List<PromotionRuleEvent> selectByRuleId(Long ruleId) {
        return mapper.selectList(new LambdaQueryWrapper<PromotionRuleEvent>()
                .eq(PromotionRuleEvent::getRuleId, ruleId)
                .orderByAsc(PromotionRuleEvent::getId));
    }

    @Override
    public void insert(PromotionRuleEvent entity) {
        mapper.insert(entity);
    }
}
