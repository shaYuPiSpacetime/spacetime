package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 代理奖金明细表
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_agent_bonus_log")
public class PromotionAgentBonusLog extends BaseEntity {
    /** 奖金流水号 */
    private String bonusNo;
    /** 代理ID */
    private Long agentId;
    /** 邀请关系ID */
    private Long relationId;
    /** 被推广用户ID */
    private Long userId;
    /** 奖金事件 */
    private String eventType;
    /** 应发奖金 */
    private BigDecimal bonusAmount;
    /** 状态 */
    private String status;
    /** 结算单ID */
    private Long settlementId;
}
