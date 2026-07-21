package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.RefundRecord;

/**
 * 退款记录数据访问接口
 */
public interface RefundRecordDao {
    RefundRecord selectById(Long id);
    RefundRecord selectByOrderId(Long orderId);
    Page<RefundRecord> selectPage(Page<RefundRecord> page, LambdaQueryWrapper<RefundRecord> wrapper);
    Long count(LambdaQueryWrapper<RefundRecord> wrapper);
    void insert(RefundRecord entity);
    void updateById(RefundRecord entity);
}
