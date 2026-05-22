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
    /** 阶梯最小成功邀请数 */
    private Integer minCount;
    /** 阶梯最大成功邀请数 */
    private Integer maxCount;
    /** 单人成家币奖励 */
    private BigDecimal rewardAmount;
    /** 状态 */
    private String status;
    /** 备注 */
    private String remark;
}
