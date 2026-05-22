package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 推广规则主表
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_rule")
public class PromotionRule extends BaseEntity {
    /** 规则名称 */
    private String ruleName;
    /** 规则类型 */
    private String ruleType;
    /** 奖励事件 */
    private String eventType;
    /** 奖励成家币或奖金金额 */
    private BigDecimal rewardAmount;
    /** 奖励单位 */
    private String rewardUnit;
    /** 单日上限 */
    private BigDecimal dailyLimit;
    /** 生效时间 */
    private LocalDateTime effectiveTime;
    /** 失效时间 */
    private LocalDateTime expireTime;
    /** 适用代理组 */
    private String agentGroup;
    /** 状态 */
    private String status;
    /** 备注 */
    private String remark;
}
