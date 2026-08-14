package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.AppMessageRuleVersion;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/** 消息规则版本 Mapper。 */
@Mapper
public interface AppMessageRuleVersionMapper extends BaseMapper<AppMessageRuleVersion> {
    @Update("UPDATE app_message_rule_version "
            + "SET status='retired', active_marker=NULL, update_time=CURRENT_TIMESTAMP "
            + "WHERE id=#{id} AND deleted=0 AND active_marker=1")
    int retireCurrent(@Param("id") Long id);
}
