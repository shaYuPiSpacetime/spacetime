package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.PromotionRewardLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * 奖励流水 Mapper
 */
@Mapper
public interface PromotionRewardLogMapper extends BaseMapper<PromotionRewardLog> {

    @Select("SELECT * FROM promotion_reward_log WHERE id = #{id} AND deleted = 0 LIMIT 1 FOR UPDATE")
    PromotionRewardLog selectByIdForUpdate(@Param("id") Long id);
}
