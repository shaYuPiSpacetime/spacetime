package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionAgent;

/**
 * 代理数据访问接口
 */
public interface PromotionAgentDao {
    PromotionAgent selectById(Long id);
    Page<PromotionAgent> selectPage(Page<PromotionAgent> page, com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PromotionAgent> wrapper);
    void insert(PromotionAgent entity);
    void updateById(PromotionAgent entity);
}
