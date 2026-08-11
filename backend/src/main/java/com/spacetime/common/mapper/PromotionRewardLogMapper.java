package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.PromotionRewardLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 奖励流水 Mapper
 */
@Mapper
public interface PromotionRewardLogMapper extends BaseMapper<PromotionRewardLog> {

    @Select("SELECT * FROM promotion_reward_log WHERE id = #{id} AND deleted = 0 LIMIT 1 FOR UPDATE")
    PromotionRewardLog selectByIdForUpdate(@Param("id") Long id);

    @Select("SELECT r.* FROM promotion_reward_log r "
            + "LEFT JOIN app_message_event_inbox i ON i.event_key=CONCAT("
            + "'prd07:system_message_create:',r.reward_no,':',r.status,':',r.inviter_id) "
            + "AND i.deleted=0 WHERE r.deleted=0 AND r.update_time>=#{updatedAfter} AND "
            + "(r.status='success' OR (r.status='failed' AND r.next_retry_time IS NULL "
            + "AND r.retry_count>=4)) AND i.id IS NULL "
            + "ORDER BY r.update_time,r.id LIMIT #{limit}")
    List<PromotionRewardLog> selectTerminalWithoutMessage(
            @Param("updatedAfter") LocalDateTime updatedAfter,
            @Param("limit") int limit);
}
