package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 普通邀请奖励流水表
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_reward_log")
public class PromotionRewardLog extends BaseEntity {
    /** 奖励流水号 */
    private String rewardNo;
    /** 邀请关系ID */
    private Long relationId;
    /** 邀请人ID */
    private Long inviterId;
    /** 被邀请人ID */
    private Long inviteeId;
    /** 奖励事件类型 */
    private String eventType;
    /** 奖励成家币 */
    private BigDecimal rewardCoin;
    /** 奖励状态 */
    private String status;
    /** 风控原因 */
    private String riskReason;
    /** 成家币流水ID */
    private Long coinLogId;
    /** 到账时间 */
    private LocalDateTime arriveTime;
    /** 复核时间 */
    private LocalDateTime reviewTime;
    /** 复核人ID */
    private Long reviewerId;
    /** 复核备注 */
    private String reviewRemark;
}
