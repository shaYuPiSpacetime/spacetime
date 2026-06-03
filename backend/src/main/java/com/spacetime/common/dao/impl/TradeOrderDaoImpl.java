package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.TradeOrderDao;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.common.mapper.TradeOrderMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 交易订单数据访问实现
 */
@Repository
@RequiredArgsConstructor
public class TradeOrderDaoImpl implements TradeOrderDao {
    /** 交易订单 MyBatis Mapper */
    private final TradeOrderMapper mapper;

    @Override
    public TradeOrder selectById(Long id) {
        return mapper.selectById(id);
    }

    @Override
    public TradeOrder selectByOrderNo(String orderNo) {
        LambdaQueryWrapper<TradeOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TradeOrder::getOrderNo, orderNo);
        return mapper.selectOne(wrapper);
    }

    @Override
    public Page<TradeOrder> selectPage(Page<TradeOrder> page, LambdaQueryWrapper<TradeOrder> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public void insert(TradeOrder entity) {
        mapper.insert(entity);
    }

    @Override
    public void updateById(TradeOrder entity) {
        mapper.updateById(entity);
    }

    @Override
    public void deleteById(Long id) {
        mapper.deleteById(id);
    }
}
