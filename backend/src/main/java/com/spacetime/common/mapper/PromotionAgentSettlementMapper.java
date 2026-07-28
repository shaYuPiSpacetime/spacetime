package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.PromotionAgentSettlement;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;

/**
 * 代理结算 Mapper
 */
@Mapper
public interface PromotionAgentSettlementMapper extends BaseMapper<PromotionAgentSettlement> {
    @Select("SELECT * FROM promotion_agent_settlement WHERE settlement_no = #{settlementNo} "
            + "AND deleted = 0 LIMIT 1 FOR UPDATE")
    PromotionAgentSettlement selectBySettlementNoForUpdate(@Param("settlementNo") String settlementNo);

    @Update("UPDATE promotion_agent_settlement SET status = 'confirmed', confirmed_by = #{operatorId}, "
            + "confirmed_time = #{confirmedAt}, update_time = NOW() WHERE id = #{id} "
            + "AND status = 'pending_confirm' AND deleted = 0")
    int confirmIfPending(@Param("id") Long id,
                         @Param("operatorId") Long operatorId,
                         @Param("confirmedAt") LocalDateTime confirmedAt);
}
