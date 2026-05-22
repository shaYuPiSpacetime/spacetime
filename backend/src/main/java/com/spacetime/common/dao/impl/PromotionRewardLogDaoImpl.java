package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionRewardLogDao;
import com.spacetime.common.entity.PromotionRewardLog;
import com.spacetime.common.mapper.PromotionRewardLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 奖励流水数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class PromotionRewardLogDaoImpl implements PromotionRewardLogDao {
    private final PromotionRewardLogMapper mapper;

    @Override
    public PromotionRewardLog selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<PromotionRewardLog> selectPage(Page<PromotionRewardLog> page, LambdaQueryWrapper<PromotionRewardLog> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(PromotionRewardLog entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(PromotionRewardLog entity) {
        mapper.updateById(entity);
    }
}
