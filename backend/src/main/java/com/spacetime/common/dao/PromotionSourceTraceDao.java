package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PromotionSourceTrace;

/**
 * 推广来源追踪数据访问接口
 */
public interface PromotionSourceTraceDao {
    PromotionSourceTrace selectByTraceNo(String traceNo);
    PromotionSourceTrace selectById(Long id);
    Page<PromotionSourceTrace> selectPage(Page<PromotionSourceTrace> page, com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<PromotionSourceTrace> wrapper);
    void insert(PromotionSourceTrace entity);
    void updateById(PromotionSourceTrace entity);
}
