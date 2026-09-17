package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.VirtualPriceChange;
import org.apache.ibatis.annotations.Mapper;

/** 微信虚拟商品改价任务 Mapper。 */
@Mapper
public interface VirtualPriceChangeMapper extends BaseMapper<VirtualPriceChange> {
}
