package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 推广规则事件金额快照。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_rule_event")
public class PromotionRuleEvent extends BaseEntity {
    /** 规则版本主键 */
    private Long ruleId;
    /** 奖励事件 */
    private String eventType;
    /** 事件展示名 */
    private String eventLabel;
    /** 是否启用 */
    private Boolean enabled;
    /** 奖励金额 */
    private BigDecimal amount;
}
