package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 推广阶梯规则表
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_rule_tier")
public class PromotionRuleTier extends BaseEntity {
    /** 规则ID */
    private Long ruleId;
    /** 精确命中的累计成功邀请人数 */
    private Integer thresholdCount;
    /** 额外奖励金额 */
    private BigDecimal amount;
    /** 是否启用 */
    private Boolean enabled;
}
