package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.TradeOrder;

/**
 * 交易订单数据访问接口
 */
public interface TradeOrderDao {
    TradeOrder selectById(Long id);
    /** 根据订单编号查询 */
    TradeOrder selectByOrderNo(String orderNo);
    Page<TradeOrder> selectPage(Page<TradeOrder> page, LambdaQueryWrapper<TradeOrder> wrapper);
    void insert(TradeOrder entity);
    void updateById(TradeOrder entity);
    void deleteById(Long id);
}
