package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.TradeOrder;
import org.apache.ibatis.annotations.Mapper;

/**
 * 交易订单 Mapper
 */
@Mapper
public interface TradeOrderMapper extends BaseMapper<TradeOrder> {
}
