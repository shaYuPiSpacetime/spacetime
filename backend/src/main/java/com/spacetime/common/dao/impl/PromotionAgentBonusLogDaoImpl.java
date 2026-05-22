package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionAgentBonusLogDao;
import com.spacetime.common.entity.PromotionAgentBonusLog;
import com.spacetime.common.mapper.PromotionAgentBonusLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 代理奖金数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class PromotionAgentBonusLogDaoImpl implements PromotionAgentBonusLogDao {
    private final PromotionAgentBonusLogMapper mapper;

    @Override
    public PromotionAgentBonusLog selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<PromotionAgentBonusLog> selectPage(Page<PromotionAgentBonusLog> page, LambdaQueryWrapper<PromotionAgentBonusLog> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(PromotionAgentBonusLog entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(PromotionAgentBonusLog entity) {
        mapper.updateById(entity);
    }
}
