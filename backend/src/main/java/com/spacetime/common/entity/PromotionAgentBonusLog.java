package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
    /** 被邀请用户ID */
    private Long inviteeId;
    /** 奖金事件 */
    private String eventType;
    /** 事件展示名快照 */
    private String eventLabelSnapshot;
    /** 规则版本主键 */
    private Long ruleId;
    /** 规则版本号 */
    private Integer ruleVersion;
    /** 阶梯阈值 */
    private Integer ladderThreshold;
    /** 应发奖金 */
    private BigDecimal amount;
    /** 发生时间 */
    private LocalDateTime occurredAt;
    /** 全局业务幂等键 */
    private String idempotencyKey;
    /** 结算单ID */
    private Long settlementId;
}
