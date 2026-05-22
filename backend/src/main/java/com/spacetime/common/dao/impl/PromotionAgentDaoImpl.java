package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionAgentDao;
import com.spacetime.common.entity.PromotionAgent;
import com.spacetime.common.mapper.PromotionAgentMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 代理数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class PromotionAgentDaoImpl implements PromotionAgentDao {
    private final PromotionAgentMapper mapper;

    @Override
    public PromotionAgent selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<PromotionAgent> selectPage(Page<PromotionAgent> page, LambdaQueryWrapper<PromotionAgent> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(PromotionAgent entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(PromotionAgent entity) {
        mapper.updateById(entity);
    }
}
