package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.RefundRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 退款记录 Mapper
 */
@Mapper
public interface RefundRecordMapper extends BaseMapper<RefundRecord> {
    @Select("SELECT * FROM app_refund_record WHERE id=#{id} AND deleted=0 LIMIT 1 FOR UPDATE")
    RefundRecord selectByIdForUpdate(@Param("id") Long id);

    @Select("SELECT r.* FROM app_refund_record r "
            + "JOIN app_trade_order o ON o.id=r.order_id AND o.deleted=0 "
            + "WHERE r.deleted=0 AND o.pay_channel='wechat_virtual' AND ("
            + "(r.refund_status='processing' AND o.order_status='refunding') OR "
            + "(r.refund_status='success' AND r.asset_rollback_action='pending' "
            + "AND o.order_status='refunded')) "
            + "ORDER BY r.update_time,r.id LIMIT #{limit}")
    List<RefundRecord> selectReconcilableVirtualRefunds(@Param("limit") int limit);
}
