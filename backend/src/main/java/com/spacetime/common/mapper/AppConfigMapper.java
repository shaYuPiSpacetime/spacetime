package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppConfig;
import org.apache.ibatis.annotations.Mapper;

/**
 * 应用配置 Mapper
 */
@Mapper
public interface AppConfigMapper extends BaseMapper<AppConfig> {
}
