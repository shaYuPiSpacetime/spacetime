package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppSystemMessage;
import org.apache.ibatis.annotations.Mapper;

/** 用户系统站内消息 Mapper。 */
@Mapper
public interface AppSystemMessageMapper extends BaseMapper<AppSystemMessage> {
}
