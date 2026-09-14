package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.UserCoinLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * 成家币流水 Mapper
 */
@Mapper
public interface UserCoinLogMapper extends BaseMapper<UserCoinLog> {
    @Select("SELECT * FROM app_user_coin_log WHERE ref_id=#{orderId} "
            + "AND ref_type='trade_order' AND flow_type='recharge' "
            + "AND biz_scene='coin_recharge' AND change_amount>0 AND deleted=0 "
            + "ORDER BY id DESC LIMIT 1")
    UserCoinLog selectPurchaseByOrderId(@Param("orderId") Long orderId);
}
