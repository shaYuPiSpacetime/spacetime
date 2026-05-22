package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionAgentEventDao;
import com.spacetime.common.entity.PromotionAgentEvent;
import com.spacetime.common.mapper.PromotionAgentEventMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 代理事件数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class PromotionAgentEventDaoImpl implements PromotionAgentEventDao {
    private final PromotionAgentEventMapper mapper;

    @Override
    public Page<PromotionAgentEvent> selectPage(Page<PromotionAgentEvent> page, LambdaQueryWrapper<PromotionAgentEvent> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(PromotionAgentEvent entity) {
        mapper.insert(entity);
    }
}
