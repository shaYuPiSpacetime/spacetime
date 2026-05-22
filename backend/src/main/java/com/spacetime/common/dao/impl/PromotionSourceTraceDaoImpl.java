package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PromotionSourceTraceDao;
import com.spacetime.common.entity.PromotionSourceTrace;
import com.spacetime.common.mapper.PromotionSourceTraceMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 推广来源追踪数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class PromotionSourceTraceDaoImpl implements PromotionSourceTraceDao {
    private final PromotionSourceTraceMapper mapper;

    @Override
    public PromotionSourceTrace selectByTraceNo(String traceNo) {
        return mapper.selectOne(new LambdaQueryWrapper<PromotionSourceTrace>().eq(PromotionSourceTrace::getTraceNo, traceNo));
    }

    @Override
    public PromotionSourceTrace selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<PromotionSourceTrace> selectPage(Page<PromotionSourceTrace> page, LambdaQueryWrapper<PromotionSourceTrace> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(PromotionSourceTrace entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(PromotionSourceTrace entity) {
        mapper.updateById(entity);
    }
}
