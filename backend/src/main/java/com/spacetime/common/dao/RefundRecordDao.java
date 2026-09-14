package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.RefundRecord;

/**
 * 退款记录数据访问接口
 */
public interface RefundRecordDao {
    RefundRecord selectById(Long id);
    /** 按主键加行锁查询，串行化退款终态与权益回收。 */
    RefundRecord selectByIdForUpdate(Long id);
    RefundRecord selectByOrderId(Long orderId);
    /** 查询待推进渠道终态或待补偿权益回收的微信虚拟支付退款。 */
    java.util.List<RefundRecord> selectReconcilableVirtualRefunds(int limit);
    Page<RefundRecord> selectPage(Page<RefundRecord> page, LambdaQueryWrapper<RefundRecord> wrapper);
    Long count(LambdaQueryWrapper<RefundRecord> wrapper);
    void insert(RefundRecord entity);
    void updateById(RefundRecord entity);
}
