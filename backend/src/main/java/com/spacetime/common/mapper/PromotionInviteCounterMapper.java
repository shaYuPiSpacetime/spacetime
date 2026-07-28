package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.PromotionInviteCounter;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

/**
 * 推广邀请计数器 Mapper。
 */
@Mapper
public interface PromotionInviteCounterMapper extends BaseMapper<PromotionInviteCounter> {

    @Select("SELECT * FROM promotion_invite_counter WHERE source_type = #{sourceType} "
            + "AND reward_object_id = #{rewardObjectId} AND deleted = 0 LIMIT 1 FOR UPDATE")
    PromotionInviteCounter selectForUpdate(@Param("sourceType") String sourceType,
                                           @Param("rewardObjectId") Long rewardObjectId);

    @Update("UPDATE promotion_invite_counter SET success_count = success_count + 1, update_time = NOW() "
            + "WHERE id = #{id} AND deleted = 0")
    int increment(@Param("id") Long id);
}
