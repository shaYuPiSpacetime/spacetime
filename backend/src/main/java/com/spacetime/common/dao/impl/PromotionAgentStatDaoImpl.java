package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.dao.PromotionAgentStatDao;
import com.spacetime.common.entity.PromotionAgentStat;
import com.spacetime.common.mapper.PromotionAgentStatMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 代理统计数据访问实现。
 */
@Repository
@RequiredArgsConstructor
public class PromotionAgentStatDaoImpl implements PromotionAgentStatDao {
    private final PromotionAgentStatMapper mapper;

    @Override
    public PromotionAgentStat selectByAgentId(Long agentId) {
        return mapper.selectOne(new LambdaQueryWrapper<PromotionAgentStat>()
                .eq(PromotionAgentStat::getAgentId, agentId));
    }

    @Override
    public void insert(PromotionAgentStat entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(PromotionAgentStat entity) {
        mapper.updateById(entity);
    }
}
