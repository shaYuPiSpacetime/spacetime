package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.TradeOrder;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 交易订单 Mapper
 */
@Mapper
public interface TradeOrderMapper extends BaseMapper<TradeOrder> {
    @Select("SELECT * FROM app_trade_order WHERE id=#{id} AND deleted=0 LIMIT 1 FOR UPDATE")
    TradeOrder selectByIdForUpdate(@Param("id") Long id);

    @Select("SELECT * FROM app_trade_order WHERE pay_channel='wechat_virtual' "
            + "AND order_status='unpaid' AND deleted=0 ORDER BY create_time,id LIMIT #{limit}")
    List<TradeOrder> selectPendingVirtualOrders(@Param("limit") int limit);

    @Select("SELECT o.* FROM app_trade_order o "
            + "LEFT JOIN app_message_event_inbox i ON i.event_key=CONCAT("
            + "'prd04:system_message_create:order:',o.order_no,':',o.order_status,':',o.user_id) "
            + "AND i.deleted=0 WHERE o.deleted=0 "
            + "AND o.order_status IN ('success','refunded') "
            + "AND o.update_time>=#{updatedAfter} AND i.id IS NULL "
            + "ORDER BY o.update_time,o.id LIMIT #{limit}")
    List<TradeOrder> selectMessageNotifiableWithoutInbox(
            @Param("updatedAfter") LocalDateTime updatedAfter, @Param("limit") int limit);
}
