package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.RefundRecordDao;
import com.spacetime.common.entity.RefundRecord;
import com.spacetime.common.mapper.RefundRecordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 退款记录数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class RefundRecordDaoImpl implements RefundRecordDao {
    /** 退款记录 Mapper */
    private final RefundRecordMapper mapper;

    @Override
    public RefundRecord selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public RefundRecord selectByOrderId(Long orderId) {
        return mapper.selectOne(new LambdaQueryWrapper<RefundRecord>()
                .eq(RefundRecord::getOrderId, orderId)
                .orderByDesc(RefundRecord::getCreateTime)
                .last("LIMIT 1"));
    }

    @Override
    public Page<RefundRecord> selectPage(Page<RefundRecord> page, LambdaQueryWrapper<RefundRecord> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public Long count(LambdaQueryWrapper<RefundRecord> wrapper) {
        return mapper.selectCount(wrapper);
    }

    @Override
    public void insert(RefundRecord entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(RefundRecord entity) {
        mapper.updateById(entity);
    }
}
