package com.spacetime.common.dao;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.TradeOrder;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 交易订单数据访问接口
 */
public interface TradeOrderDao {
    TradeOrder selectById(Long id);
    /** 按主键加行锁查询，防止支付结果重复入账 */
    TradeOrder selectByIdForUpdate(Long id);
    /** 根据订单编号查询 */
    TradeOrder selectByOrderNo(String orderNo);
    /** 查询待确认的微信虚拟支付订单 */
    List<TradeOrder> selectPendingVirtualOrders(int limit);
    Page<TradeOrder> selectPage(Page<TradeOrder> page, LambdaQueryWrapper<TradeOrder> wrapper);
    List<TradeOrder> selectMessageNotifiableWithoutInbox(LocalDateTime updatedAfter, int limit);
    void insert(TradeOrder entity);
    void updateById(TradeOrder entity);
    void deleteById(Long id);
}
