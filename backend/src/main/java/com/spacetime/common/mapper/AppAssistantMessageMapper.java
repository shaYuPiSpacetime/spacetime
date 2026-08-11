package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppAssistantMessage;
import org.apache.ibatis.annotations.Mapper;

/** 官方助手消息 Mapper。 */
@Mapper
public interface AppAssistantMessageMapper extends BaseMapper<AppAssistantMessage> {
}
