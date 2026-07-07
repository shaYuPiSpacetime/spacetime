package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.RefundRecord;
import org.apache.ibatis.annotations.Mapper;

/**
 * 退款记录 Mapper
 */
@Mapper
public interface RefundRecordMapper extends BaseMapper<RefundRecord> {
}
