package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * VIP权益配置
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("app_vip_benefit")
public class VipBenefit extends BaseEntity {
    /** 权益编码 */
    private String benefitCode;
    /** 权益名称 */
    private String benefitName;
    /** 权益类型 */
    private String benefitType;
    /** 权益描述 */
    private String benefitDesc;
    /** 展示排序 */
    private Integer displayOrder;
    /** 状态: ENABLED/DISABLED */
    private String status;
}
