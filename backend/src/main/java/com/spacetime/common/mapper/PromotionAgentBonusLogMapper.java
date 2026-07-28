package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.PromotionAgentBonusLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/**
 * 代理奖金 Mapper
 */
@Mapper
public interface PromotionAgentBonusLogMapper extends BaseMapper<PromotionAgentBonusLog> {
    @Update("UPDATE promotion_agent_bonus_log SET settlement_id = #{settlementId}, update_time = NOW() "
            + "WHERE id = #{bonusId} AND settlement_id IS NULL AND deleted = 0")
    int bindSettlementIfUnsettled(@Param("bonusId") Long bonusId,
                                  @Param("settlementId") Long settlementId);
}
