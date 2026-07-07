package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.CommercialConfigLog;
import org.apache.ibatis.annotations.Mapper;

/**
 * 商业化配置变更审计 Mapper
 */
@Mapper
public interface CommercialConfigLogMapper extends BaseMapper<CommercialConfigLog> {
}
