package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.PaymentNotifyLog;

/**
 * 支付回调日志数据访问接口
 */
public interface PaymentNotifyLogDao {
    PaymentNotifyLog selectById(Long id);
    Page<PaymentNotifyLog> selectPage(Page<PaymentNotifyLog> page, LambdaQueryWrapper<PaymentNotifyLog> wrapper);
    void insert(PaymentNotifyLog entity);
}
