package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.TradeOrderDao;
import com.spacetime.common.entity.TradeOrder;
import com.spacetime.common.mapper.TradeOrderMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

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
    public TradeOrder selectByIdForUpdate(Long id) {
        return mapper.selectByIdForUpdate(id);
    }

    @Override
    public TradeOrder selectByOrderNo(String orderNo) {
        LambdaQueryWrapper<TradeOrder> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(TradeOrder::getOrderNo, orderNo);
        return mapper.selectOne(wrapper);
    }

    @Override
    public List<TradeOrder> selectPendingVirtualOrders(int limit) {
        return mapper.selectPendingVirtualOrders(limit);
    }

    @Override
    public Page<TradeOrder> selectPage(Page<TradeOrder> page, LambdaQueryWrapper<TradeOrder> wrapper) {
        return mapper.selectPage(page, wrapper);
    }

    @Override
    public List<TradeOrder> selectMessageNotifiableWithoutInbox(
            LocalDateTime updatedAfter, int limit) {
        return mapper.selectMessageNotifiableWithoutInbox(updatedAfter, limit);
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
