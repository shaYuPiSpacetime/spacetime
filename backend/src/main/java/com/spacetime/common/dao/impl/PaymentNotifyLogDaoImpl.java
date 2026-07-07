package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.PaymentNotifyLogDao;
import com.spacetime.common.entity.PaymentNotifyLog;
import com.spacetime.common.mapper.PaymentNotifyLogMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 支付回调日志数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class PaymentNotifyLogDaoImpl implements PaymentNotifyLogDao {
    /** 支付回调日志 Mapper */
    private final PaymentNotifyLogMapper mapper;

    @Override
    public PaymentNotifyLog selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public Page<PaymentNotifyLog> selectPage(Page<PaymentNotifyLog> page, LambdaQueryWrapper<PaymentNotifyLog> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(PaymentNotifyLog entity) {
        mapper.insert(entity);
    }
}
