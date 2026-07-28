package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.PromotionAgentStat;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;
import org.apache.ibatis.annotations.Select;

/**
 * 代理统计 Mapper。
 */
@Mapper
public interface PromotionAgentStatMapper extends BaseMapper<PromotionAgentStat> {
    @Select("SELECT * FROM promo_agent_stat WHERE agent_id = #{agentId} AND deleted = 0 LIMIT 1 FOR UPDATE")
    PromotionAgentStat selectByAgentIdForUpdate(@Param("agentId") Long agentId);

    @Update("UPDATE promo_agent_stat SET click_cnt = click_cnt + 1, stat_version = stat_version + 1, "
            + "update_time = NOW() WHERE agent_id = #{agentId} AND deleted = 0")
    int incrementScanClickCount(@Param("agentId") Long agentId);
}
