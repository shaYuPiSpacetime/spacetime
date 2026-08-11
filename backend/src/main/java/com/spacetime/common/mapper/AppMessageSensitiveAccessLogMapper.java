package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppMessageSensitiveAccessLog;
import org.apache.ibatis.annotations.Mapper;

/** 敏感正文访问审计 Mapper。 */
@Mapper
public interface AppMessageSensitiveAccessLogMapper extends BaseMapper<AppMessageSensitiveAccessLog> {
}
