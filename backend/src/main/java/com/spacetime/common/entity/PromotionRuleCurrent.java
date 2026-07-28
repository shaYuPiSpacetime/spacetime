package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 每类推广来源的当前规则指针。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("promotion_rule_current")
public class PromotionRuleCurrent extends BaseEntity {
    /** 来源类型 */
    private String sourceType;
    /** 当前规则版本主键 */
    private Long ruleId;
    /** 当前版本号，同时作为乐观锁值 */
    private Integer versionNo;
}
