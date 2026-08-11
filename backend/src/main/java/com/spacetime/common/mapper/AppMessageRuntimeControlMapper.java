package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppMessageRuntimeControl;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/** 消息运行时安全开关 Mapper。 */
@Mapper
public interface AppMessageRuntimeControlMapper extends BaseMapper<AppMessageRuntimeControl> {
    @Select("SELECT * FROM app_message_runtime_control WHERE control_key=#{controlKey} "
            + "AND deleted=0 LIMIT 1 FOR UPDATE")
    AppMessageRuntimeControl selectByControlKeyForUpdate(@Param("controlKey") String controlKey);
}
