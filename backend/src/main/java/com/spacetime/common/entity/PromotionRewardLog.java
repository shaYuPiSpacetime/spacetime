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
    /** 事件展示名快照 */
    private String eventLabelSnapshot;
    /** 规则版本主键 */
    private Long ruleId;
    /** 规则版本号 */
    private Integer ruleVersion;
    /** 阶梯阈值，仅阶梯奖励有值 */
    private Integer ladderThreshold;
    /** 奖励千寻币整数 */
    private BigDecimal amount;
    /** 奖励状态 */
    private String status;
    /** 全局业务幂等键 */
    private String idempotencyKey;
    /** 自动重试次数 */
    private Integer retryCount;
    /** 下次自动重试时间 */
    private LocalDateTime nextRetryTime;
    /** 最近重试时间 */
    private LocalDateTime lastRetryTime;
    /** 最近失败原因 */
    private String failureReason;
    /** 成家币流水ID */
    private Long coinLogId;
    /** 入账成功时间 */
    private LocalDateTime successTime;
}
