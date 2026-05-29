package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.ContentOperationLog;
import org.apache.ibatis.annotations.Mapper;

/**
 * 公共内容配置操作日志 Mapper
 */
@Mapper
public interface ContentOperationLogMapper extends BaseMapper<ContentOperationLog> {
}
