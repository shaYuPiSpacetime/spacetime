package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionAgentEvent;

/**
 * 代理事件数据访问接口
 */
public interface PromotionAgentEventDao {
    Page<PromotionAgentEvent> selectPage(Page<PromotionAgentEvent> page, com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PromotionAgentEvent> wrapper);
    void insert(PromotionAgentEvent entity);
}
